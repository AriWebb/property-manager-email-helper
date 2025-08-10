const InboxSDK = require('@inboxsdk/core');
import type { ComposeView, ThreadView} from '@inboxsdk/core';

let isEnabled = true;

InboxSDK.load(2, 'sdk_propertymanage_f1f1c36d4b').then((sdk: any) => {
    sdk.Compose.registerComposeViewHandler((composeView: ComposeView) => {
        addToggleButton(composeView);
        setupAutoGeneration(composeView);
    });
    sdk.Conversations.registerThreadViewHandler((threadView: ThreadView) => {
        addSidebar(threadView);
    });
});

function addToggleButton(composeView: ComposeView): void {
    composeView.addButton({
        title: isEnabled ? '🏠 Property Manager Enabled' : '🏠 Property Manager Disabled',
        iconUrl: chrome.runtime.getURL('home.svg'),
        onClick: () => {
            isEnabled = !isEnabled;
            console.log('Property Manager toggled:', isEnabled ? 'enabled' : 'disabled');
        }
    });
}

function addSidebar(threadView: ThreadView): void {
    threadView.addSidebarContentPanel({
        title: 'Thread Summary',
        iconUrl: chrome.runtime.getURL('home.svg'),
        el: (() => {
          const container = document.createElement('div');
          container.style.padding = '12px';
          container.style.fontFamily = 'Segoe UI, sans-serif';
          container.style.fontSize = '14px';
          container.style.color = '#333';
          container.style.lineHeight = '1.4';
          
          container.innerHTML = `
            <div style="border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 8px;">
              <strong>Summary</strong>
            </div>
            <div id="thread-summary">
              Loading conversation data...
            </div>
          `;
          return container;
        })(),
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