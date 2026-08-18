# SVG Viewer for Visual Studio Code

[![Release](https://img.shields.io/github/v/release/SawatKia/svg-viewer?color=blue&label=release)](https://github.com/SawatKia/svg-viewer/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)


A powerful, high-performance SVG viewer extension for VS Code featuring interactive pan & zoom, multi-mode background toggling, quick preset zoom chips, and a sidebar for managing recently opened files.

---

## ✨ Features

### 🔍 Interactive Pan & Zoom
- **Smooth Zooming**: Use the mouse scroll wheel to effortlessly zoom in and out centered on your mouse cursor.
- **Fluid Panning**: Click and drag using the middle mouse button (or left mouse drag) to navigate around complex SVGs.
- **Double-Click Fit**: Double-click anywhere on the canvas to instantly fit the SVG to your view window.

### 🎨 Background Modes
Easily inspect SVGs with transparent elements by toggling between custom preview backgrounds:
- **Default Theme Background**
- **Crisp White Background**
- **Contrast Black Background**
- **Transparency Checkerboard Grid**

Toggle via the bottom toolbar button or press <kbd>B</kbd>.

### ⚡ Quick Zoom Chips
Jump directly to standard magnification levels with a single click:
- `25%` | `50%` | `100%` | `200%` | `400%` | `Fit`

### 🚀 Hybrid Rendering Engine
- **Fast Mode**: Uses optimized Blob and `<img>` rendering for high frame-rate viewing and snappy interactions.
- **Inline SVG Mode**: Handles complex SVGs, diagrams with `foreignObject` tags, and large ER diagrams seamlessly without rendering artifacts or UI lockups.
- **Visual Status Badges**: Displays natural dimensions, file size, and current scale in real-time.

### 🗂️ Dedicated Sidebar & History
- **Activity Bar Access**: Click the dedicated SVG Viewer icon in the VS Code Activity Bar.
- **File Picker**: Open any SVG file from disk directly via the sidebar button.
- **Persistent History**: Keeps track of recently inspected SVGs across VS Code workspace sessions.

---

## ⌨️ Controls & Shortcuts

| Action | Shortcut / Input | Description |
|---|---|---|
| **Zoom In / Out** | Mouse Wheel / <kbd>+</kbd> / <kbd>-</kbd> | Smooth zoom centered on cursor |
| **Pan** | Middle Click + Drag / Left Drag | Pan around the canvas |
| **Fit to View** | <kbd>F</kbd> or Double-Click | Fits the entire SVG into the viewport |
| **Reset Zoom (1:1)** | <kbd>0</kbd> or Click Zoom Label | Resets scale back to 100% |
| **Toggle Background** | <kbd>B</kbd> or 🎨 Toolbar Button | Cycle through Default, White, Black, Grid |
| **Quick Zoom Chips** | Click chip (`25%` ... `400%`) | Smoothly jumps to selected zoom level |

---

## 🚀 Getting Started

### Opening an SVG
1. **Context Menu**: Right-click any `.svg` file in the Explorer and select **"Open with..." &rarr; "Better SVG Preview"**.
2. **Default Editor**: Set as the default editor for `.svg` files by selecting **"Configure default editor for '*.svg'..."**.
3. **Sidebar**: Open the **SVG Viewer** tab in the Activity Bar and click **"Select SVG File"** or pick from recent history.

---

## 📦 Installation

### Install from VSIX Release
1. Download the latest `.vsix` file from the [Releases](https://github.com/SawatKia/svg-viewer/releases) page.
2. In VS Code, open the Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`).
3. Click the **`...`** (More Actions) menu at the top right of the Extensions panel.
4. Choose **"Install from VSIX..."** and select the downloaded `.vsix` file.

Or via CLI:
```bash
code --install-extension svg-viewer-0.0.4.vsix
```

---

## 🛠️ Development & Building

### Prerequisites
- Node.js (v18 or newer)
- npm

### Setup
```bash
git clone https://github.com/SawatKia/svg-viewer.git
cd svg-viewer/svg-viewer
npm install
```

### Build & Watch
```bash
# Run typecheck and compile
npm run compile

# Development watch mode
npm run watch
```

### Package VSIX Locally
```bash
npm run package
# or use the packaging script
./package.bat
```

---

## 🔄 CI / CD & Releases

This repository includes automated GitHub Actions workflows:
- Pushing commits or tags (`v*`) to `main` or `master` triggers automated compilation, testing, VSIX packaging, and GitHub Release creation.

---

## 📄 License

This extension is licensed under the [MIT License](LICENSE).
