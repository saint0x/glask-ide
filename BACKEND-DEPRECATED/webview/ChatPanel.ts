import * as vscode from 'vscode';
import { DefaultToolManager } from '../tools';
import { join } from 'path';

export class ChatPanel {
  public static currentPanel: ChatPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel, private readonly toolManager: DefaultToolManager) {
    this._panel = panel;
    this._update();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        try {
          const result = await this.toolManager.executeCommand(message.command);
          this._panel.webview.postMessage({
            type: 'result',
            content: result
          });
        } catch (error) {
          this._panel.webview.postMessage({
            type: 'error',
            content: error instanceof Error ? error.message : String(error)
          });
        }
      },
      null,
      this._disposables
    );
  }

  public static createOrShow(extensionUri: vscode.Uri, toolManager: DefaultToolManager) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (ChatPanel.currentPanel) {
      ChatPanel.currentPanel._panel.reveal(column);
      return;
    }

    const webviewPath = vscode.Uri.file(join(extensionUri.fsPath, 'dist', 'webview'));

    const panel = vscode.window.createWebviewPanel(
      'codeAssistant',
      'Code Assistant',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [webviewPath]
      }
    );

    ChatPanel.currentPanel = new ChatPanel(panel, toolManager);
  }

  private _update() {
    this._panel.webview.html = this._getHtmlForWebview();
  }

  private _getHtmlForWebview(): string {
    const webview = this._panel.webview;
    const webviewPath = this._panel.webview.options.localResourceRoots![0];
    
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.file(join(webviewPath.fsPath, 'index.js'))
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.file(join(webviewPath.fsPath, 'index.css'))
    );
    const nonce = getNonce();

    return `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource};">
        <link href="${styleUri}" rel="stylesheet">
        <title>Code Assistant</title>
      </head>
      <body>
        <div id="root"></div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
    </html>`;
  }

  public dispose() {
    ChatPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
} 