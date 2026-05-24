Chatty Export Reader

A desktop application for browsing exported AI conversations in a clean, searchable, readable interface.
Chatty Export Reader makes it easier to explore exported ChatGPT/OpenAI conversation archives with thread navigation, conversation viewing, search tools, notes, redaction support, and a customizable atmospheric reading space.

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

Features

- Browse exported conversation threads
- Read conversations in a clean desktop interface
- Search within conversation archives
- Add notes / annotations
- Redact or focus conversation content
- Export conversation views
- Customizable background environments

Notes

- The renderer runs with `contextIsolation` enabled and no `nodeIntegration`. File access is provided through a safe preload API (`window.api.openFile()` / `window.api.loadDefault()`).
- If your exports include separate assets, you may need to adapt the viewer to resolve local asset paths.

License

- Licensed under the Apache License 2.0.