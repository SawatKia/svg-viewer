# Change Log

All notable changes to the "svg-viewer" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.0.4]

- Add background toggle button (White, Black, Grid)
- Add quick zoom percentage chips

## [0.0.34]

- Implemented hybrid rendering strategy: `<img>` for performance, inline SVG for complexity/foreignObject support
- Fixed issue where large SVGs (e.g., ERDs) failed to render due to `foreignObject` limitations or lack of explicit dimensions
- Added detailed loading state with file size and dimension info
- Added toolbar with zoom controls (+, -, 100%, Fit)
- Added keyboard shortcuts: `F` (Fit), `0` (Reset), `+`/`-` (Zoom)
- Added error handling with retry functionality

  > **Note**: Versions **below 0.0.34** had known rendering issues with large SVGs

## [0.0.33]

- Optimized rendering for large SVGs using Blob and `<img>` tag (prevents UI freeze)
- Added loading indicator for SVG processing
- Debounced webview updates to improve responsiveness during edits
- Reduced memory footprint by disabling background context retention

## [0.0.32]

- Improved support for large SVGs (initial fit-to-screen)
- Added double-click to reset zoom/pan

## [0.0.31]

- Fix SVG display issue when opening from history
- Refactor codebase to follow Single Responsibility Principle (SRP)

## [0.0.3]

- Zoom to cursor pointer
- Cursor updates to indicate zoomable/pannable state
- Improved panning support (Left and Middle click)

## [0.0.2]

- Add file selecting from sidebar
- Add history tracking for opened SVG files

## [0.0.1]

- Zoom with scrolling
- Pan with middle mouse
- Initial release
