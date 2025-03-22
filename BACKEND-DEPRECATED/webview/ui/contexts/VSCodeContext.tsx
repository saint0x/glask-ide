import React, { createContext, useContext, useCallback } from 'react';

interface VSCodeApi {
  postMessage(message: any): void;
  getState(): any;
  setState(state: any): void;
}

interface VSCodeContextType {
  postMessage: (message: any) => void;
  onMessage: (callback: (message: any) => void) => () => void;
}

interface VSCodeProviderProps {
  vscode: VSCodeApi;
  children: React.ReactNode;
}

const VSCodeContext = createContext<VSCodeContextType | null>(null);

export const VSCodeProvider: React.FC<VSCodeProviderProps> = ({ vscode, children }) => {
  const postMessage = useCallback((message: any) => {
    vscode.postMessage(message);
  }, [vscode]);

  const onMessage = useCallback((callback: (message: any) => void) => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      callback(message);
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return (
    <VSCodeContext.Provider value={{ postMessage, onMessage }}>
      {children}
    </VSCodeContext.Provider>
  );
};

export const useVSCode = (): VSCodeContextType => {
  const context = useContext(VSCodeContext);
  if (!context) {
    throw new Error('useVSCode must be used within a VSCodeProvider');
  }
  return context;
}; 