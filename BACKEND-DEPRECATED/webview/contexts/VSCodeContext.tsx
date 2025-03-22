import React, { createContext, useContext } from 'react';

declare global {
  interface Window {
    acquireVsCodeApi: () => {
      postMessage: (message: any) => void;
      getState: () => any;
      setState: (state: any) => void;
    };
  }
}

// Initialize VS Code API
const vscode = (() => {
  const api = window.acquireVsCodeApi();
  // Remove the function after initialization to prevent multiple calls
  delete window.acquireVsCodeApi;
  return api;
})();

const VSCodeContext = createContext<typeof vscode | null>(null);

export const VSCodeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <VSCodeContext.Provider value={vscode}>
      {children}
    </VSCodeContext.Provider>
  );
};

export const useVSCode = () => {
  const context = useContext(VSCodeContext);
  if (!context) {
    throw new Error('useVSCode must be used within a VSCodeProvider');
  }
  return context;
}; 