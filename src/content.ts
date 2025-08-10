const InboxSDK = require('@inboxsdk/core');
import type { ComposeView, ThreadView} from '@inboxsdk/core';

let isEnabled = true;
let currentStreamingElement: HTMLElement | null = null;
let streamedContent = '';

InboxSDK.load(2, 'sdk_propertymanage_f1f1c36d4b').then((sdk: any) => {
    sdk.Compose.registerComposeViewHandler((composeView: ComposeView) => {
        // addToggleButton(composeView);
        setupAutoGeneration(composeView);
    });
    sdk.Conversations.registerThreadViewHandler((threadView: ThreadView) => {
        addSidebar(threadView);
    });
});

// Listen for streaming messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'streamStart':
      handleStreamStart();
      break;
    case 'streamToken':
      handleStreamToken(message.token);
      break;
    case 'streamEnd':
      handleStreamEnd();
      break;
    case 'streamError':
      handleStreamError(message.error);
      break;
  }
});

function handleStreamStart(): void {
    streamedContent = '';
    if (currentStreamingElement) {
        currentStreamingElement.innerHTML = 'Analyzing...';
    }
}

function handleStreamToken(token: string): void {
    streamedContent += token;
    if (currentStreamingElement) {
        // Convert newlines to HTML breaks for proper display
        const htmlContent = streamedContent.replace(/\n/g, '<br>');
        currentStreamingElement.innerHTML = htmlContent;
        
        // Add a cursor effect to show it's still streaming
        currentStreamingElement.innerHTML += '<span style="animation: blink 1s infinite;">|</span>';
    }
}

function handleStreamEnd(): void {
    if (currentStreamingElement) {
        // Remove the cursor and finalize content
        const htmlContent = streamedContent.replace(/\n/g, '<br>');
        currentStreamingElement.innerHTML = htmlContent;
    }
    streamedContent = '';
}

function handleStreamError(error: string): void {
    if (currentStreamingElement) {
        currentStreamingElement.innerHTML = `<span style="color: red;">Error: ${error}</span>`;
    }
    streamedContent = '';
}

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
        title: 'Tenant Law Compliance Assistant',
        iconUrl: chrome.runtime.getURL('home.svg'),
        el: (() => {
          const container = document.createElement('div');
          container.style.padding = '12px';
          container.style.fontFamily = 'Segoe UI, sans-serif';
          container.style.fontSize = '14px';
          container.style.color = '#333';
          container.style.lineHeight = '1.4';
          
          const summaryDiv = document.createElement('div');
          summaryDiv.id = 'thread-summary';
          summaryDiv.innerHTML = '<em>Start typing out an email and the assistant will analyze it for compliance...</em>';
          
          container.appendChild(summaryDiv);
          
          // Set this as the current streaming element
          currentStreamingElement = summaryDiv;
          
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
        // Set the streaming element to the summary element if it exists
        const summaryElement = document.getElementById('thread-summary');
        if (summaryElement) {
            currentStreamingElement = summaryElement;
        }

        // Send message to background script to start streaming
        const response = await chrome.runtime.sendMessage({
            action: "generateReply",
            threadText: content
        });
        
        if (!response?.success) {
            if (currentStreamingElement) {
                currentStreamingElement.innerHTML = `Error: ${response?.error || 'Failed to start stream'}`;
            }
        }
        // Note: The actual response will come through the streaming message handlers
    } catch (error: any) {
        console.error('Auto-generation error:', error);
        if (currentStreamingElement) {
            currentStreamingElement.innerHTML = `<span style="color: red;">Error: ${error.message}</span>`;
        }
    }
}