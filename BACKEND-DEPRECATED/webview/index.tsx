import React from 'react';
import { createRoot } from 'react-dom/client';
import { VSCodeProvider } from './contexts/VSCodeContext';
import { Chat } from './ui/components/Chat';
import './ui/styles/global.css';
import styles from './ui/styles/Chat.module.css';
import codeBlockStyles from './ui/styles/CodeBlock.module.css';

// Force CSS modules to be included in the build
const unusedStyles = { styles, codeBlockStyles };

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element not found');
}

createRoot(root).render(
  <React.StrictMode>
    <VSCodeProvider>
      <Chat />
    </VSCodeProvider>
  </React.StrictMode>
); 