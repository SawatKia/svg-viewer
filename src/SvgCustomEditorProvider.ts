import * as vscode from 'vscode';
import { SvgHistoryTreeProvider } from './SvgHistoryTreeProvider';

export class SvgCustomEditorProvider implements vscode.CustomTextEditorProvider {
    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly historyProvider: SvgHistoryTreeProvider
    ) { }

    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {

        // Add to history when opened
        this.historyProvider.addToHistory(document.uri);

        webviewPanel.webview.options = {
            enableScripts: true,
        };

        const updateWebview = () => {
            webviewPanel.webview.postMessage({
                type: 'update',
                text: document.getText(),
            });
        };

        // Listen for messages from the webview
        webviewPanel.webview.onDidReceiveMessage(message => {
            if (message.type === 'ready') {
                updateWebview();
            }
        });

        webviewPanel.webview.html = this.getHtmlForWebview();

        // Also initial update just in case, but 'ready' should handle it
        // updateWebview();

        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                updateWebview();
            }
        });

        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });
    }

    private getHtmlForWebview(): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    overflow: hidden;
                    background-color: var(--vscode-editor-background);
                    height: 100vh;
                    width: 100vw;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                #container {
                    width: 100%;
                    height: 100%;
                    position: relative;
                    overflow: hidden;
                    cursor: grab;
                }
                #container:active {
                    cursor: grabbing;
                }
                #content {
                    position: absolute;
                    top: 0;
                    left: 0;
                    transform-origin: 0 0;
                }
                #content svg {
                    display: block;
                    width: auto;
                    height: auto;
                }
            </style>
        </head>
        <body>
            <div id="container">
                <div id="content"></div>
            </div>
            <script>
                const vscode = acquireVsCodeApi();
                const content = document.getElementById('content');
                const container = document.getElementById('container');
                
                let scale = 1;
                let translateX = 0;
                let translateY = 0;
                let isPanning = false;
                let startX = 0;
                let startY = 0;

                // Signal that we are ready to receive content
                // Use a small timeout to ensure the listener on the extension side is ready?? 
                // No, the webview is created by the extension, so the listener is set up before HTML is set usually?
                // Actually, HTML is set, then script runs. Listener is set BEFORE html is set.
                vscode.postMessage({ type: 'ready' });

                window.addEventListener('message', event => {
                    const message = event.data;
                    if (message.type === 'update') {
                        content.innerHTML = message.text;
                        scale = 1;
                        translateX = 0;
                        translateY = 0;
                        updateTransform();
                        // Wait for layout to settle
                        setTimeout(centerContent, 50);
                    }
                });

                function centerContent() {
                    const containerRect = container.getBoundingClientRect();
                    const contentRect = content.getBoundingClientRect();
                    
                    // Depending on SVG size vs Container size, we might want to scale it to fit or just center.
                    // For now, let's just center.
                    if (contentRect.width > 0 && contentRect.height > 0) {
                         translateX = (containerRect.width - contentRect.width) / 2;
                         translateY = (containerRect.height - contentRect.height) / 2;
                         updateTransform();
                    }
                }

                // Zoom with mouse wheel aiming at cursor
                container.addEventListener('wheel', (e) => {
                    e.preventDefault();
                    
                    const rect = container.getBoundingClientRect();
                    const mouseX = e.clientX - rect.left;
                    const mouseY = e.clientY - rect.top;

                    // Zoom in (1.1) or out (0.9)
                    const delta = e.deltaY > 0 ? 0.9 : 1.1;
                    const newScale = scale * delta;

                    // Calculate new translation to keep the point under cursor fixed
                    translateX = mouseX - (mouseX - translateX) * delta;
                    translateY = mouseY - (mouseY - translateY) * delta;
                    scale = newScale;

                    updateTransform();
                });

                // Pan with left (0) or middle (1) mouse button
                container.addEventListener('mousedown', (e) => {
                    if (e.button === 0 || e.button === 1) {
                        e.preventDefault();
                        isPanning = true;
                        startX = e.clientX - translateX;
                        startY = e.clientY - translateY;
                        container.style.cursor = 'grabbing';
                    }
                });

                window.addEventListener('mousemove', (e) => {
                    if (!isPanning) return;
                    e.preventDefault();
                    translateX = e.clientX - startX;
                    translateY = e.clientY - startY;
                    updateTransform();
                });

                window.addEventListener('mouseup', () => {
                    isPanning = false;
                    container.style.cursor = 'grab';
                });
                
                window.addEventListener('mouseleave', () => {
                    isPanning = false;
                    container.style.cursor = 'grab';
                });

                function updateTransform() {
                    content.style.transform = \`translate(\${translateX}px, \${translateY}px) scale(\${scale})\`;
                }
            </script>
        </body>
        </html>`;
    }
}
