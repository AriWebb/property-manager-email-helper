# Property Manager Email Helper

An AI-powered Gmail Chrome extension that helps property managers write compliant tenant communications. This extension integrates directly into Gmail to provide intelligent email suggestions and assistance for property management workflows.

## Features

- 🤖 AI-powered email writing assistance
- 📧 Seamless Gmail integration
- 🏠 Property management specific templates
- ⚖️ Tenant law compliance assistance
- 🔒 Secure OpenAI API integration

## Prerequisites

- Node.js (version 14 or higher)
- npm
- Google Chrome browser
- OpenAI API key

## Setup Instructions

### 1. Build the Extension

First, install dependencies and build the extension:

```bash
npm install
npm run build
```

This will create a `dist` folder with the compiled extension files.

### 2. Load Extension in Chrome

1. Open Google Chrome
2. Navigate to `chrome://extensions/` or go to **Chrome menu** > **More tools** > **Extensions**
3. Enable **Developer mode** (toggle in the top right corner)
4. Click **Load unpacked**
5. Select the `dist` folder from your project directory

### 3. Configure OpenAI API Key

1. Navigate to [Gmail](https://mail.google.com)
2. Click on the extension icon in your Chrome toolbar (or access it through the Extensions menu)
3. In the popup that appears, enter your OpenAI API key
4. Save the configuration

### 4. Using the Extension

Once configured, the extension will add a tab on the right-hand side of Gmail. You can use this tab to:

- Get AI-powered writing suggestions
- Access property management templates
- Ensure tenant law compliance in your communications

## Development

For development mode with hot reloading:

```bash
npm run dev
```

To clean the build directory:

```bash
npm run clean
```

## Getting an OpenAI API Key

1. Visit [OpenAI's website](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to the API section
4. Generate a new API key
5. Copy the key for use in the extension

## Security Note

Your OpenAI API key is stored locally in your browser and is only used to make requests to OpenAI's API. Never share your API key with others.

## License

MIT License - see LICENSE file for details.
