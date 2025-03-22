export interface LLMConfig {
  model: string;
  apiToken: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed';
  output?: string;
  error?: string;
  metrics?: {
    totalTokens?: number;
    promptTokens?: number;
    completionTokens?: number;
    totalTime?: number;
  };
}

export interface StreamChunk {
  type: 'text' | 'error' | 'done';
  content: string;
  timestamp: number;
}

export type StreamCallback = (chunk: StreamChunk) => void | Promise<void>;

export interface LLMOptions {
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
  topP?: number;
  topK?: number;
} 