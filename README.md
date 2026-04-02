# OAI Export Reader (Electron)

Minimal Electron wrapper for the existing OpenAI export HTML viewer.

Quick start

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm start
```

Usage

- The app will try to load `Conversation/conversations.json` from the project folder on startup.
- Click "Open Export File" to pick any local JSON export; the viewer will render the selected file.

Notes

- The renderer runs with `contextIsolation` enabled and no `nodeIntegration`. File access is provided through a safe preload API (`window.api.openFile()` / `window.api.loadDefault()`).
- If your exports include separate assets, you may need to adapt the viewer to resolve local asset paths.
