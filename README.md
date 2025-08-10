# Smart Gmail Writer

AI-powered email writing assistant for Gmail using OpenAI GPT-4.

## Features

- 🤖 AI-powered email reply generation
- 📧 Seamless Gmail integration using InboxSDK
- 🔐 Secure API key storage
- ✨ Professional, context-aware responses

## Development

### Setup
```bash
npm install
```

### Build for Production
```bash
npm run build
```

### Development Mode (with watch)
```bash
npm run dev
```

## Installation

1. Build the extension: `npm run build`
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist` folder
5. Configure your OpenAI API key in the extension popup

## Project Structure

```
src/
├── manifest.json     # Extension manifest
├── content.js        # InboxSDK integration
├── background.js     # OpenAI API handling
├── popup.html        # Settings popup
├── popup.js          # Popup logic
└── popup.css         # Popup styles
```

## Built Files

The `dist/` folder contains the production-ready extension:
- All dependencies bundled with webpack
- Minified and optimized for Chrome Web Store
- Ready to upload as a Chrome extension