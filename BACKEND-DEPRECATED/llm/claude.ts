import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync } from 'fs';
import { env } from '../utils/env';
import { logger } from '../utils/logger';
import { LLMConfig, LLMOptions, LLMResponse, StreamCallback } from './types';

const execAsync = promisify(exec);

export class ClaudeLLM {
  private readonly config: LLMConfig;
  private readonly baseUrl = 'https://api.replicate.com/v1/models/anthropic/claude-3.5-haiku/predictions';

  constructor(config?: Partial<LLMConfig>) {
    this.config = {
      model: 'anthropic/claude-3.5-haiku',
      apiToken: env.get('REPLICATE_API_TOKEN'),
      systemPrompt: this.loadSystemPrompt(),
      temperature: 0.7,
      maxTokens: 4096,
      ...config
    };
  }

  private loadSystemPrompt(): string {
    try {
      const systemPromptPath = env.get('SYSTEM_PROMPT_PATH');
      return readFileSync(systemPromptPath, 'utf-8');
    } catch (error) {
      logger.error('Failed to load system prompt:', error);
      return '';
    }
  }

  private buildCurlCommand(prompt: string, options: LLMOptions = {}): string {
    const input = {
      prompt: this.config.systemPrompt ? `${this.config.systemPrompt}\n\n${prompt}` : prompt,
      stream: options.stream ?? true,
      temperature: options.temperature ?? this.config.temperature,
      max_tokens: options.maxTokens ?? this.config.maxTokens,
      stop_sequences: options.stopSequences,
      top_p: options.topP,
      top_k: options.topK
    };

    const curlCmd = `curl --silent --show-error ${options.stream ? '--no-buffer' : ''} \\
      ${this.baseUrl} \\
      --request POST \\
      --header "Authorization: Bearer ${this.config.apiToken}" \\
      --header "Content-Type: application/json" \\
      --data '${JSON.stringify(input)}'`;

    return curlCmd;
  }

  private buildStreamCommand(streamUrl: string): string {
    return `curl --silent --show-error --no-buffer "${streamUrl}" \\
      --header "Accept: text/event-stream" \\
      --header "Cache-Control: no-store"`;
  }

  public async complete(prompt: string, options: LLMOptions = {}): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      // Initial prediction request
      const predictionCmd = this.buildCurlCommand(prompt, { ...options, stream: false });
      const { stdout: predictionResponse } = await execAsync(predictionCmd);
      const prediction = JSON.parse(predictionResponse);

      if (prediction.error) {
        throw new Error(prediction.error);
      }

      const response: LLMResponse = {
        id: prediction.id,
        status: prediction.status,
        output: prediction.output,
        metrics: {
          totalTime: Date.now() - startTime
        }
      };

      return response;
    } catch (error) {
      logger.error('LLM completion failed:', error);
      throw error;
    }
  }

  public async stream(
    prompt: string,
    callback: StreamCallback,
    options: LLMOptions = {}
  ): Promise<void> {
    try {
      // Initial prediction request
      const predictionCmd = this.buildCurlCommand(prompt, { ...options, stream: true });
      const { stdout: predictionResponse } = await execAsync(predictionCmd);
      const prediction = JSON.parse(predictionResponse);

      if (prediction.error) {
        throw new Error(prediction.error);
      }

      // Stream the response
      const streamUrl = prediction.urls.stream;
      const streamCmd = this.buildStreamCommand(streamUrl);

      const streamProcess = exec(streamCmd);
      let buffer = '';

      streamProcess.stdout?.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        buffer += text;

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.startsWith('data: ')) {
            const data = line.slice(6); // Remove 'data: ' prefix
            try {
              const event = JSON.parse(data);
              callback({
                type: event.done ? 'done' : 'text',
                content: event.output || '',
                timestamp: Date.now()
              });
            } catch (error) {
              logger.error('Failed to parse stream chunk:', error);
            }
          }
        }
      });

      streamProcess.stderr?.on('data', (data: Buffer) => {
        callback({
          type: 'error',
          content: data.toString(),
          timestamp: Date.now()
        });
      });

      return new Promise((resolve, reject) => {
        streamProcess.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Stream process exited with code ${code}`));
          }
        });

        streamProcess.on('error', (error) => {
          reject(error);
        });
      });
    } catch (error) {
      logger.error('LLM streaming failed:', error);
      throw error;
    }
  }

  public async completeWithRetry(
    prompt: string,
    options: LLMOptions = {},
    maxRetries = 3,
    delay = 1000
  ): Promise<LLMResponse> {
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.complete(prompt, options);
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Retry ${i + 1}/${maxRetries} failed:`, error);
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
      }
    }

    throw lastError || new Error('All retries failed');
  }

  public async streamWithRetry(
    prompt: string,
    callback: StreamCallback,
    options: LLMOptions = {},
    maxRetries = 3,
    delay = 1000
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.stream(prompt, callback, options);
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Retry ${i + 1}/${maxRetries} failed:`, error);
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
      }
    }

    throw lastError || new Error('All retries failed');
  }
} 