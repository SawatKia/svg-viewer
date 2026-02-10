# SVG Viewer for VS Code

An enhanced SVG viewer extension that provides a better preview experience with pan and zoom capabilities, along with a convenient sidebar for managing and accessing recent SVG files.

## Features

### 🔍 Enhanced SVG Preview

- **Pan & Zoom**: Inspect your SVG files with precision.
  - **Zoom**: Use the mouse scroll wheel to zoom in and out.
  - **Pan**: Click and drag with the middle mouse button (or scroll wheel click) to move around the canvas.
- **Responsive Canvas**: Preview pane adapts to your editor layout.

### 🗂️ File Management Sidebar

- **Quick Access**: The extension adds a dedicated "SVG Viewer" icon to the Activity Bar.
- **Select File**: Easily browse and open SVG files from your system using the "Select SVG File" button.
- **History Tracking**: Automatically keeps a history of your recently opened SVG files.
  - Click any history item to instantly reopen it in the enhanced preview.
  - Recent files are persisted across VS Code sessions.

## Usage

1. **Opening a standard SVG file**:
   - Right-click an SVG file in the Explorer and select "Open with..." -> "Better SVG Preview".
   - Or configure it as your default editor for `.svg` files in your user settings.

2. **Using the Sidebar**:
   - Click the **SVG Viewer** icon in the Activity Bar.
   - Click **Select SVG File** to browse and open a file.
   - Click any file in the **History** list to reopen it.

3. **In the Preview**:
   - **Scroll Wheel**: Zoom in/out.
   - **Middle Mouse + Drag**: Pan the view.

## Extension Settings

This extension contributes the following views:

- `svg-viewer-sidebar`: Container for the SVG explorer in the Activity Bar.

## Known Issues

- Complex animations or interactive scripts within SVGs might behave differently than in a full browser environment, though basic rendering is handled by the VS Code webview engine.

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for detailed release history.

---

**Enjoy better SVG previews!**
