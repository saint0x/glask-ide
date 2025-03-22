import React from 'react';
import { createRoot } from 'react-dom/client';
import { VSCodeProvider } from './contexts/VSCodeContext';
import { Chat } from './components/Chat';
import './styles.css';

// Get VS Code API
declare global {
  interface Window {
    acquireVsCodeApi: () => any;
  }
}

const vscode = window.acquireVsCodeApi();
const container = document.getElementById('root');

if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <VSCodeProvider vscode={vscode}>
        <Chat />
      </VSCodeProvider>
    </React.StrictMode>
  );
} 