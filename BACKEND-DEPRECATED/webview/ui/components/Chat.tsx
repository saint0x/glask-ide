import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useVSCode } from '../../contexts/VSCodeContext';
import { CodeBlock } from './CodeBlock';
import styles from '../styles/Chat.module.css';

interface Message {
  type: 'assistant' | 'user' | 'result' | 'error';
  content: string;
  timestamp: string;
}

export const Chat: React.FC = () => {
  const vscode = useVSCode();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    // Add welcome message
    setMessages([
      {
        type: 'assistant',
        content: 'Welcome to Code Assistant! How can I help you?',
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);

    // Set up message handler
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          type: message.type === 'error' ? 'error' : 'result',
          content: message.content,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      setIsProcessing(false);
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      type: 'user',
      content: input,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    vscode.postMessage({
      command: input.trim(),
    });
  };

  return (
    <div className={styles['chat-container']}>
      <div className={styles.messages}>
        {messages.map((message, index) => (
          <div key={index} className={styles.message}>
            <div className={styles['message-header']}>
              <span className={styles['message-type']}>{message.type}</span>
              <span className={styles['message-time']}>{message.timestamp}</span>
            </div>
            <div className={styles['message-content']}>
              {message.type === 'result' ? (
                <CodeBlock content={message.content} />
              ) : (
                message.content
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
        {isProcessing && (
          <div className={styles.loading}>Processing your request...</div>
        )}
      </div>
      <form onSubmit={handleSubmit} className={styles['input-form']}>
        <textarea
          className={styles['input-textarea']}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a command..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          disabled={isProcessing}
        />
        <button
          type="submit"
          className={styles['submit-button']}
          disabled={isProcessing || !input.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
} 