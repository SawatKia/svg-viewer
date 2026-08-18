// svg-viewer\src\SvgCustomEditorProvider.ts
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

        let updateTimeout: any | undefined;
        const updateWebview = () => {
            if (updateTimeout) {
                clearTimeout(updateTimeout);
            }
            updateTimeout = setTimeout(() => {
                webviewPanel.webview.postMessage({
                    type: 'update',
                    text: document.getText(),
                });
            }, 300);
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
        return /* html */`<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                * { box-sizing: border-box; }
                body {
                    margin: 0;
                    padding: 0;
                    overflow: hidden;
                    background-color: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                    font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
                    font-size: var(--vscode-font-size, 13px);
                    height: 100vh;
                    width: 100vw;
                    display: flex;
                    flex-direction: column;
                }

                /* ── Container & Content ───────────────────── */
                #container {
                    flex: 1;
                    position: relative;
                    overflow: hidden;
                    cursor: grab;
                }
                #container:active { cursor: grabbing; }

                #content {
                    position: absolute;
                    top: 0;
                    left: 0;
                    transform-origin: 0 0;
                }

                #content img,
                #content svg {
                    display: block;
                    pointer-events: none;
                    -webkit-user-drag: none;
                }
                #content img {
                    width: auto !important;
                    height: auto !important;
                    max-width: none !important;
                    max-height: none !important;
                }
                /* Inline SVGs need explicit dimensions from parsed values */
                #content > svg {
                    overflow: visible;
                }

                /* ── Loading Overlay ───────────────────────── */
                #loading-overlay {
                    position: fixed;
                    inset: 0;
                    display: none;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    background: var(--vscode-editor-background);
                }
                #loading-overlay.visible { display: flex; }

                .loading-card {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 16px;
                    padding: 32px 48px;
                    border-radius: 8px;
                    background: color-mix(in srgb, var(--vscode-editor-background) 90%, white 10%);
                    border: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.2));
                    box-shadow: 0 4px 24px rgba(0,0,0,0.15);
                }
                .spinner {
                    width: 32px;
                    height: 32px;
                    border: 3px solid rgba(128,128,128,0.2);
                    border-top-color: var(--vscode-progressBar-background, #0078d4);
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }

                .loading-text {
                    font-size: 13px;
                    opacity: 0.8;
                }
                .loading-detail {
                    font-size: 11px;
                    opacity: 0.5;
                    margin-top: -8px;
                }

                /* ── Error Overlay ─────────────────────────── */
                #error-overlay {
                    position: fixed;
                    inset: 0;
                    display: none;
                    align-items: center;
                    justify-content: center;
                    z-index: 1001;
                    background: var(--vscode-editor-background);
                }
                #error-overlay.visible { display: flex; }
                .error-card {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 12px;
                    padding: 32px 48px;
                    border-radius: 8px;
                    background: color-mix(in srgb, var(--vscode-editor-background) 90%, white 10%);
                    border: 1px solid var(--vscode-errorForeground, #f44);
                    box-shadow: 0 4px 24px rgba(0,0,0,0.15);
                    max-width: 400px;
                    text-align: center;
                }
                .error-icon {
                    font-size: 28px;
                    color: var(--vscode-errorForeground, #f44);
                }
                .error-message {
                    font-size: 13px;
                    color: var(--vscode-errorForeground, #f44);
                }
                .error-detail {
                    font-size: 11px;
                    opacity: 0.6;
                    word-break: break-word;
                }
                .retry-btn {
                    padding: 6px 16px;
                    border: 1px solid var(--vscode-button-border, transparent);
                    border-radius: 4px;
                    background: var(--vscode-button-background, #0078d4);
                    color: var(--vscode-button-foreground, #fff);
                    cursor: pointer;
                    font-size: 12px;
                    transition: opacity 0.15s;
                }
                .retry-btn:hover { opacity: 0.85; }

                /* ── Toolbar ───────────────────────────────── */
                #toolbar {
                    position: fixed;
                    bottom: 12px;
                    left: 50%;
                    transform: translateX(-50%);
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    padding: 4px 8px;
                    border-radius: 6px;
                    background: color-mix(in srgb, var(--vscode-editor-background) 85%, white 15%);
                    border: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.2));
                    box-shadow: 0 2px 12px rgba(0,0,0,0.15);
                    z-index: 100;
                    opacity: 0;
                    transition: opacity 0.2s;
                    user-select: none;
                }
                #toolbar.visible { opacity: 1; }
                #toolbar:hover { opacity: 1 !important; }

                .tb-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 28px;
                    height: 28px;
                    border: none;
                    border-radius: 4px;
                    background: transparent;
                    color: var(--vscode-editor-foreground);
                    cursor: pointer;
                    font-size: 14px;
                    transition: background 0.15s;
                    padding: 0;
                }
                .tb-btn:hover {
                    background: var(--vscode-toolbar-hoverBackground, rgba(128,128,128,0.15));
                }
                .tb-btn:active {
                    background: var(--vscode-toolbar-activeBackground, rgba(128,128,128,0.25));
                }
                .tb-sep {
                    width: 1px;
                    height: 18px;
                    background: var(--vscode-widget-border, rgba(128,128,128,0.25));
                    margin: 0 4px;
                }
                #zoom-label {
                    min-width: 48px;
                    text-align: center;
                    font-size: 11px;
                    font-variant-numeric: tabular-nums;
                    opacity: 0.8;
                    cursor: pointer;
                }
                #zoom-label:hover { opacity: 1; }

                /* ── Info badge (top-right) ─────────────────── */
                #info-badge {
                    position: fixed;
                    top: 8px;
                    right: 12px;
                    font-size: 11px;
                    opacity: 0.4;
                    z-index: 100;
                    pointer-events: none;
                    transition: opacity 0.2s;
                }
                #info-badge:hover { opacity: 0.8; }

                /* ── Rendering mode badge ──────────────────── */
                #render-mode {
                    position: fixed;
                    top: 8px;
                    left: 12px;
                    font-size: 10px;
                    opacity: 0;
                    z-index: 100;
                    pointer-events: none;
                    padding: 2px 8px;
                    border-radius: 4px;
                    background: color-mix(in srgb, var(--vscode-editor-background) 80%, white 20%);
                    border: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.15));
                    transition: opacity 0.3s;
                }
                body:hover #render-mode { opacity: 0.5; }

                /* ── Smooth transition for programmatic moves ─ */
                #content.smooth {
                    transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                }

                /* ── Backgrounds ───────────────────────────── */
                .bg-white { background-color: #ffffff !important; }
                .bg-black { background-color: #1a1a1a !important; }
                .bg-grid {
                    background-color: #fff;
                    background-image: 
                        linear-gradient(45deg, #efefef 25%, transparent 25%), 
                        linear-gradient(-45deg, #efefef 25%, transparent 25%), 
                        linear-gradient(45deg, transparent 75%, #efefef 75%), 
                        linear-gradient(-45deg, transparent 75%, #efefef 75%);
                    background-size: 20px 20px;
                    background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
                }

                /* ── Zoom Chips ────────────────────────────── */
                #zoom-chips {
                    position: fixed;
                    bottom: 54px;
                    left: 50%;
                    transform: translateX(-50%);
                    display: flex;
                    gap: 6px;
                    z-index: 100;
                    opacity: 0;
                    transition: opacity 0.2s, transform 0.2s;
                    pointer-events: none;
                }
                #zoom-chips.visible { 
                    opacity: 1; 
                    pointer-events: auto;
                    transform: translateX(-50%) translateY(0);
                }
                body:not(:hover) #zoom-chips { opacity: 0; }

                .chip {
                    padding: 3px 10px;
                    border-radius: 12px;
                    background: color-mix(in srgb, var(--vscode-editor-background) 85%, white 15%);
                    border: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.2));
                    font-size: 10px;
                    cursor: pointer;
                    transition: all 0.1s;
                    color: var(--vscode-editor-foreground);
                    backdrop-filter: blur(4px);
                }
                .chip:hover {
                    background: var(--vscode-toolbar-hoverBackground, rgba(128,128,128,0.25));
                    border-color: var(--vscode-focusBorder);
                    transform: translateY(-1px);
                }
                .chip:active {
                    transform: translateY(0);
                }
            </style>
        </head>
        <body>
            <!-- Loading overlay -->
            <div id="loading-overlay" class="visible">
                <div class="loading-card">
                    <div class="spinner"></div>
                    <div class="loading-text">Loading SVG…</div>
                    <div class="loading-detail" id="loading-detail"></div>
                </div>
            </div>

            <!-- Error overlay -->
            <div id="error-overlay">
                <div class="error-card">
                    <div class="error-icon">⚠</div>
                    <div class="error-message" id="error-message">Failed to load SVG</div>
                    <div class="error-detail" id="error-detail"></div>
                    <button class="retry-btn" id="retry-btn">Retry</button>
                </div>
            </div>

            <!-- Canvas -->
            <div id="container">
                <div id="content"></div>
            </div>

            <!-- Info badges -->
            <div id="info-badge"></div>
            <div id="render-mode"></div>

            <!-- Zoom chips -->
            <div id="zoom-chips">
                <div class="chip" data-zoom="0.25">25%</div>
                <div class="chip" data-zoom="0.5">50%</div>
                <div class="chip" data-zoom="1">100%</div>
                <div class="chip" data-zoom="2">200%</div>
                <div class="chip" data-zoom="4">400%</div>
                <div class="chip" id="chip-fit">Fit</div>
            </div>

            <!-- Bottom toolbar -->
            <div id="toolbar">
                <button class="tb-btn" id="btn-zoom-out" title="Zoom Out (-)">−</button>
                <span id="zoom-label" title="Click to reset zoom">100%</span>
                <button class="tb-btn" id="btn-zoom-in" title="Zoom In (+)">+</button>
                <div class="tb-sep"></div>
                <button class="tb-btn" id="btn-fit" title="Fit to View (F)">⊞</button>
                <button class="tb-btn" id="btn-reset" title="Reset to 100% (0)">1:1</button>
                <div class="tb-sep"></div>
                <button class="tb-btn" id="btn-bg" title="Cycle Background (B)">🎨</button>
            </div>

            <script>
            (function() {
                const vscode = acquireVsCodeApi();
                const content = document.getElementById('content');
                const container = document.getElementById('container');
                const loadingOverlay = document.getElementById('loading-overlay');
                const loadingDetail = document.getElementById('loading-detail');
                const errorOverlay = document.getElementById('error-overlay');
                const errorMessage = document.getElementById('error-message');
                const errorDetail = document.getElementById('error-detail');
                const retryBtn = document.getElementById('retry-btn');
                const toolbar = document.getElementById('toolbar');
                const zoomLabel = document.getElementById('zoom-label');
                const infoBadge = document.getElementById('info-badge');
                const renderMode = document.getElementById('render-mode');
                const zoomChips = document.getElementById('zoom-chips');

                let scale = 1;
                let translateX = 0;
                let translateY = 0;
                let isPanning = false;
                let startX = 0;
                let startY = 0;
                let currentObjectUrl = null;
                let naturalWidth = 0;
                let naturalHeight = 0;
                let lastSvgText = '';
                let bgMode = 0; // 0: None, 1: White, 2: Black, 3: Grid

                // ── SVG Parsing ──────────────────────────────
                function parseSvgInfo(svgText) {
                    let width = 0, height = 0;
                    let viewBox = null;
                    const hasForeignObject = /<foreignObject[\\s>]/i.test(svgText);

                    // Extract viewBox
                    const vbMatch = svgText.match(/viewBox\\s*=\\s*["']([^"']+)["']/i);
                    if (vbMatch) {
                        const parts = vbMatch[1].trim().split(/[\\s,]+/).map(Number);
                        if (parts.length === 4 && parts.every(n => !isNaN(n))) {
                            viewBox = { minX: parts[0], minY: parts[1], width: parts[2], height: parts[3] };
                        }
                    }

                    // Extract width / height (support px, em, %, or plain numbers)
                    const wMatch = svgText.match(/<svg[^>]*\\swidth\\s*=\\s*["'](\\d+\\.?\\d*)(px)?["']/i);
                    const hMatch = svgText.match(/<svg[^>]*\\sheight\\s*=\\s*["'](\\d+\\.?\\d*)(px)?["']/i);
                    if (wMatch) width = parseFloat(wMatch[1]);
                    if (hMatch) height = parseFloat(hMatch[1]);

                    // Fallback to viewBox dimensions
                    if ((!width || !height) && viewBox) {
                        width = width || viewBox.width;
                        height = height || viewBox.height;
                    }

                    // Last resort: try to find width/height in style attribute
                    if (!width || !height) {
                        const styleMatch = svgText.match(/<svg[^>]*style\\s*=\\s*["']([^"']+)["']/i);
                        if (styleMatch) {
                            const wStyle = styleMatch[1].match(/width\\s*:\\s*(\\d+\\.?\\d*)/);
                            const hStyle = styleMatch[1].match(/height\\s*:\\s*(\\d+\\.?\\d*)/);
                            if (wStyle) width = width || parseFloat(wStyle[1]);
                            if (hStyle) height = height || parseFloat(hStyle[1]);
                        }
                    }

                    // Calculate size
                    const sizeBytes = new Blob([svgText]).size;
                    const sizeStr = sizeBytes > 1048576
                        ? (sizeBytes / 1048576).toFixed(1) + ' MB'
                        : (sizeBytes / 1024).toFixed(1) + ' KB';

                    return {
                        width: width || 300,
                        height: height || 150,
                        viewBox,
                        hasForeignObject,
                        sizeBytes,
                        sizeStr,
                        hasExplicitDimensions: !!(wMatch && hMatch) || !!vbMatch
                    };
                }

                // ── Rendering ────────────────────────────────
                function showLoading(detail) {
                    loadingOverlay.classList.add('visible');
                    errorOverlay.classList.remove('visible');
                    toolbar.classList.remove('visible');
                    loadingDetail.textContent = detail || '';
                }

                function hideLoading() {
                    loadingOverlay.classList.remove('visible');
                    toolbar.classList.add('visible');
                    zoomChips.classList.add('visible');
                }

                function cycleBackground() {
                    bgMode = (bgMode + 1) % 4;
                    container.classList.remove('bg-white', 'bg-black', 'bg-grid');
                    if (bgMode === 1) container.classList.add('bg-white');
                    if (bgMode === 2) container.classList.add('bg-black');
                    if (bgMode === 3) container.classList.add('bg-grid');
                }

                function showError(msg, detail) {
                    loadingOverlay.classList.remove('visible');
                    errorOverlay.classList.add('visible');
                    toolbar.classList.remove('visible');
                    errorMessage.textContent = msg || 'Failed to load SVG';
                    errorDetail.textContent = detail || '';
                }

                function renderSvg(svgText) {
                    lastSvgText = svgText;
                    const info = parseSvgInfo(svgText);

                    showLoading(info.sizeStr + ' — ' + info.width.toFixed(0) + ' × ' + info.height.toFixed(0));
                    infoBadge.textContent = info.width.toFixed(0) + ' × ' + info.height.toFixed(0) + '  ·  ' + info.sizeStr;

                    // Choose rendering strategy
                    if (info.hasForeignObject) {
                        renderMode.textContent = 'inline rendering';
                        renderInline(svgText, info);
                    } else {
                        renderMode.textContent = 'image rendering';
                        renderAsImage(svgText, info);
                    }
                }

                function renderAsImage(svgText, info) {
                    // Clean up previous
                    if (currentObjectUrl) {
                        URL.revokeObjectURL(currentObjectUrl);
                        currentObjectUrl = null;
                    }

                    const blob = new Blob([svgText], { type: 'image/svg+xml' });
                    currentObjectUrl = URL.createObjectURL(blob);

                    const img = document.createElement('img');

                    // Set explicit dimensions so browser knows the intended size
                    img.setAttribute('width', String(info.width));
                    img.setAttribute('height', String(info.height));

                    let loadTimedOut = false;
                    const loadTimeout = setTimeout(() => {
                        loadTimedOut = true;
                        // Image didn't load in time — try inline fallback
                        console.warn('[SVG Viewer] Image load timed out, falling back to inline.');
                        renderMode.textContent = 'inline rendering (fallback)';
                        renderInline(svgText, info);
                    }, 10000);

                    img.onload = () => {
                        if (loadTimedOut) return;
                        clearTimeout(loadTimeout);

                        // Validate the image actually rendered
                        const imgNaturalW = img.naturalWidth || info.width;
                        const imgNaturalH = img.naturalHeight || info.height;

                        if (imgNaturalW <= 1 || imgNaturalH <= 1) {
                            // Image rendered at 0×0 — fallback to inline
                            console.warn('[SVG Viewer] Image rendered at 0 size, falling back to inline.');
                            renderMode.textContent = 'inline rendering (fallback)';
                            renderInline(svgText, info);
                            return;
                        }

                        naturalWidth = imgNaturalW;
                        naturalHeight = imgNaturalH;

                        content.innerHTML = '';
                        content.appendChild(img);

                        resetAndFit();
                        hideLoading();
                    };

                    img.onerror = () => {
                        if (loadTimedOut) return;
                        clearTimeout(loadTimeout);
                        // Fallback to inline rendering
                        console.warn('[SVG Viewer] Image failed to load, falling back to inline.');
                        renderMode.textContent = 'inline rendering (fallback)';
                        renderInline(svgText, info);
                    };

                    img.src = currentObjectUrl;
                }

                function renderInline(svgText, info) {
                    // Clean up blob URL if any
                    if (currentObjectUrl) {
                        URL.revokeObjectURL(currentObjectUrl);
                        currentObjectUrl = null;
                    }

                    // Sanitize: remove script tags
                    let sanitized = svgText.replace(/<script[\\s\\S]*?<\\/script>/gi, '');

                    // Parse and inject into DOM
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(sanitized, 'image/svg+xml');
                    const svgEl = doc.documentElement;

                    // Check for parse errors
                    const parseError = doc.querySelector('parsererror');
                    if (parseError) {
                        showError('Invalid SVG', parseError.textContent?.substring(0, 200));
                        return;
                    }

                    // Ensure the SVG has explicit dimensions and viewBox
                    if (!svgEl.getAttribute('viewBox') && info.viewBox) {
                        svgEl.setAttribute('viewBox',
                            info.viewBox.minX + ' ' + info.viewBox.minY + ' ' +
                            info.viewBox.width + ' ' + info.viewBox.height);
                    }
                    svgEl.setAttribute('width', String(info.width));
                    svgEl.setAttribute('height', String(info.height));

                    naturalWidth = info.width;
                    naturalHeight = info.height;

                    content.innerHTML = '';
                    content.appendChild(document.importNode(svgEl, true));

                    resetAndFit();
                    hideLoading();
                }

                // ── View Controls ────────────────────────────
                function resetAndFit() {
                    scale = 1;
                    translateX = 0;
                    translateY = 0;
                    updateTransform(false);
                    fitToView(false);
                }

                function fitToView(smooth) {
                    if (naturalWidth <= 0 || naturalHeight <= 0) return;

                    const cr = container.getBoundingClientRect();
                    const scaleX = cr.width / naturalWidth;
                    const scaleY = cr.height / naturalHeight;
                    let s = Math.min(scaleX, scaleY) * 0.92;
                    if (s > 1) s = 1;

                    scale = s;
                    translateX = (cr.width  - naturalWidth  * scale) / 2;
                    translateY = (cr.height - naturalHeight * scale) / 2;
                    updateTransform(smooth);
                }

                function resetZoom(smooth) {
                    const cr = container.getBoundingClientRect();
                    scale = 1;
                    translateX = (cr.width  - naturalWidth)  / 2;
                    translateY = (cr.height - naturalHeight) / 2;
                    updateTransform(smooth);
                }

                function zoomBy(factor, cx, cy) {
                    if (cx === undefined || cy === undefined) {
                        const cr = container.getBoundingClientRect();
                        cx = cr.width  / 2;
                        cy = cr.height / 2;
                    }
                    translateX = cx - (cx - translateX) * factor;
                    translateY = cy - (cy - translateY) * factor;
                    scale *= factor;
                    updateTransform(false);
                }

                function updateTransform(smooth) {
                    if (smooth) {
                        content.classList.add('smooth');
                        setTimeout(() => content.classList.remove('smooth'), 350);
                    }
                    content.style.transform = 'translate(' + translateX + 'px, ' + translateY + 'px) scale(' + scale + ')';
                    zoomLabel.textContent = Math.round(scale * 100) + '%';
                }

                // ── Mouse: Wheel Zoom ────────────────────────
                container.addEventListener('wheel', (e) => {
                    e.preventDefault();
                    const rect = container.getBoundingClientRect();
                    const mx = e.clientX - rect.left;
                    const my = e.clientY - rect.top;
                    const factor = e.deltaY > 0 ? 0.9 : 1.1;
                    zoomBy(factor, mx, my);
                }, { passive: false });

                // ── Mouse: Pan ───────────────────────────────
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
                    updateTransform(false);
                });
                window.addEventListener('mouseup',    () => { isPanning = false; container.style.cursor = 'grab'; });
                window.addEventListener('mouseleave',  () => { isPanning = false; container.style.cursor = 'grab'; });

                // ── Mouse: Double-click → Fit ────────────────
                container.addEventListener('dblclick', () => { fitToView(true); });

                window.addEventListener('keydown', (e) => {
                    if (e.key === 'f' || e.key === 'F') { fitToView(true); }
                    if (e.key === '0')                   { resetZoom(true); }
                    if (e.key === '+' || e.key === '=')  { zoomBy(1.15); }
                    if (e.key === '-' || e.key === '_')  { zoomBy(0.85); }
                    if (e.key === 'b' || e.key === 'B')  { cycleBackground(); }
                });

                // ── Toolbar Buttons ──────────────────────────
                document.getElementById('btn-zoom-in').addEventListener('click',  () => zoomBy(1.15));
                document.getElementById('btn-zoom-out').addEventListener('click', () => zoomBy(0.85));
                document.getElementById('btn-fit').addEventListener('click',      () => fitToView(true));
                document.getElementById('btn-reset').addEventListener('click',    () => resetZoom(true));
                document.getElementById('btn-bg').addEventListener('click',       () => cycleBackground());
                zoomLabel.addEventListener('click', () => resetZoom(true));

                // ── Zoom Chips ───────────────────────────────
                document.querySelectorAll('.chip[data-zoom]').forEach(chip => {
                    chip.addEventListener('click', () => {
                        const targetZoom = parseFloat(chip.dataset.zoom);
                        const cr = container.getBoundingClientRect();
                        const cx = cr.width / 2;
                        const cy = cr.height / 2;
                        
                        // Smoothly zoom to the center
                        const factor = targetZoom / scale;
                        zoomBy(factor, cx, cy);
                        updateTransform(true);
                    });
                });
                document.getElementById('chip-fit').addEventListener('click', () => fitToView(true));

                // ── Retry Button ─────────────────────────────
                retryBtn.addEventListener('click', () => {
                    if (lastSvgText) renderSvg(lastSvgText);
                });

                // ── Resize Observer ──────────────────────────
                const resizeObserver = new ResizeObserver(() => {
                    if (naturalWidth > 0 && naturalHeight > 0) {
                        fitToView(false);
                    }
                });
                resizeObserver.observe(container);

                // ── Message Handler ──────────────────────────
                window.addEventListener('message', event => {
                    const message = event.data;
                    if (message.type === 'update') {
                        renderSvg(message.text);
                    }
                });

                // ── Signal Ready ─────────────────────────────
                vscode.postMessage({ type: 'ready' });
            })();
            </script>
        </body>
        </html>`;
    }
}

