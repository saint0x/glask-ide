import React, { useState } from 'react';
import styles from '../styles/CodeBlock.module.css';

interface CodeBlockProps {
  content: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ content }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div className={styles['code-block']}>
      <button
        className={`${styles['copy-button']} ${isCopied ? styles.copied : ''}`}
        onClick={handleCopy}
      >
        {isCopied ? 'Copied!' : 'Copy'}
      </button>
      <pre>
        <code>{content}</code>
      </pre>
    </div>
  );
}; 