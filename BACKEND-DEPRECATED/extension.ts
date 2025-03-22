import * as vscode from 'vscode';
import { ChatPanel } from './webview/ChatPanel';
import { DefaultToolManager } from './tools';

export function activate(context: vscode.ExtensionContext) {
  const toolManager = new DefaultToolManager();

  let disposable = vscode.commands.registerCommand('code-ext.openChat', () => {
    ChatPanel.createOrShow(context.extensionUri, toolManager);
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {} 