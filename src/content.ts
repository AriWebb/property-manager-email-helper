const InboxSDK = require('@inboxsdk/core');
import type { ComposeView } from '@inboxsdk/core';

let isEnabled = true;

InboxSDK.load(2, 'sdk_propertymanage_f1f1c36d4b').then((sdk: any) => {
    sdk.Compose.registerComposeViewHandler((composeView: ComposeView) => {
        addToggleButton(composeView);
        setupAutoGeneration(composeView);
    });
});

function addToggleButton(composeView: ComposeView): void {
    const button = composeView.addButton({
        title: isEnabled ? '🏠 Property Manager Enabled' : '🏠 Property Manager Disabled',
        iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiI+PHRleHQ+8J+PoDwvdGV4dD48L3N2Zz4=',
        onClick: () => {
            isEnabled = !isEnabled;
            console.log('Property Manager toggled:', isEnabled ? 'enabled' : 'disabled');
        }
    });
}

function setupAutoGeneration(composeView: ComposeView): void {
    const bodyElement = composeView.getBodyElement();
    
    bodyElement.addEventListener('keyup', (event: KeyboardEvent) => {
        if (!isEnabled || event.key !== '.') return;
        
        const content = composeView.getTextContent();
        if (content.trim().length < 10) return; // Skip if too short
        
        generateAndAppend(composeView, content);
    });
}

async function generateAndAppend(composeView: ComposeView, content: string): Promise<void> {
    try {
        const response = await chrome.runtime.sendMessage({
            action: "generateReply",
            threadText: `Subject: ${composeView.getSubject()}\nCurrent content: ${content}`
        });
        
        if (response?.success && response.reply) {
            const currentContent = composeView.getTextContent();
            composeView.setBodyText(currentContent + ' ' + response.reply);
        }
    } catch (error) {
        console.error('Auto-generation error:', error);
    }
}