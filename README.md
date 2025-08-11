# Property Manager Email Helper

San Francisco has over 200,000 renters and thousands of property managers navigating one of the most complex landlord-tenant legal landscapes in the country. California state statutes and San Francisco’s rent ordinance are lengthy, intricate, and often overlap—making compliance a constant challenge.

We built an email assistant that helps property managers and landlords in San Francisco write legally compliant emails in real time. As they type, the assistant flags potential violations of California or San Francisco laws and suggests clear, legally sound fixes.

By making legal guidance instantly accessible, our tool helps property managers and landlords respect tenants’ rights, avoid costly disputes, and save thousands in potential legal fees—while fostering better landlord-tenant relationships.

Team:

- Ari Webb — MS in Computer Science from Stanford. Previously bootstrapped a property management platform serving 5 companies managing 10,000+ units. Has firsthand experience with the difficulty and expense of complying with landlord-tenant laws.

- Eugene Liu — Software engineer at Twine (YC S23) and practicing attorney at Bornstein Law, a real estate law firm specializing in landlord-tenant issues in San Francisco. Has seen how non-compliance can lead to steep legal costs and protracted disputes for landlords.

## Features

- AI-powered email writing assistance
- Seamless Gmail integration
- Property management specific templates
- Tenant law compliance assistance
- Secure OpenAI API integration

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
