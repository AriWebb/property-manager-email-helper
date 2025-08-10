const InboxSDK = require('@inboxsdk/core');
import type { ComposeView, ThreadView} from '@inboxsdk/core';

let isEnabled = true;
let currentStreamingElement: HTMLElement | null = null;
let streamedContent = '';
let currentComposeView: ComposeView | null = null;
let updatedLetterContent: string = '';
let applyButton: HTMLElement | null = null;
let originalContent: string = '';
let isApplied: boolean = false;

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
        // Parse and clean the response content during streaming
        let cleanedContent = parseAIResponse(streamedContent);
        const htmlContent = cleanedContent.replace(/\n/g, '<br>');
        currentStreamingElement.innerHTML = htmlContent;
        
        // Add a cursor effect to show it's still streaming
        currentStreamingElement.innerHTML += '<span style="animation: blink 1s infinite;">|</span>';
    }
}

function handleStreamEnd(): void {
    if (currentStreamingElement) {
        // Parse and clean the response content
        let cleanedContent = parseAIResponse(streamedContent);
        const htmlContent = cleanedContent.replace(/\n/g, '<br>');
        currentStreamingElement.innerHTML = htmlContent;
    }
    streamedContent = '';
}

function parseAIResponse(content: string): string {
    // Extract updated letter content if it exists
    const updatedLetterMatch = content.match(/Updated Letter:\s*([\s\S]*?)$/i);
    if (updatedLetterMatch) {
        updatedLetterContent = updatedLetterMatch[1].trim();
        showApplyButton();
    } else {
        updatedLetterContent = '';
        hideApplyButton();
    }
    
    // Remove "Explanation:" and "Updated Letter:" prefixes
    let cleaned = content;
    
    // Replace "Explanation:" with nothing, but keep the content after it
    cleaned = cleaned.replace(/Explanation:\s*/gi, '');
    
    // Replace "Updated Letter:" with a line break and bold "Updated Letter" text
    cleaned = cleaned.replace(/Updated Letter:\s*/gi, '\n\n**Updated Letter:**\n');
    
    return cleaned.trim();
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
          
          // Create apply button (initially hidden)
          applyButton = document.createElement('button');
          applyButton.id = 'apply-updated-letter';
          applyButton.innerHTML = 'Apply Updated Letter';
          applyButton.style.cssText = `
            display: none;
            margin-top: 12px;
            padding: 8px 16px;
            background-color: #1a73e8;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            width: 100%;
          `;
          applyButton.addEventListener('click', handleButtonClick);
          applyButton.addEventListener('mouseenter', () => {
            applyButton!.style.backgroundColor = '#1557b0';
          });
          applyButton.addEventListener('mouseleave', () => {
            applyButton!.style.backgroundColor = '#1a73e8';
          });
          
          container.appendChild(summaryDiv);
          container.appendChild(applyButton);
          
          // Set this as the current streaming element
          currentStreamingElement = summaryDiv;
          
          return container;
        })(),
      });
}

function setupAutoGeneration(composeView: ComposeView): void {
    // Store reference to current compose view
    currentComposeView = composeView;
    
    const bodyElement = composeView.getBodyElement();
    
    bodyElement.addEventListener('keyup', (event: KeyboardEvent) => {
        if (!isEnabled || event.key !== '.') return;
        
        const content = composeView.getTextContent();
        if (content.trim().length < 10) return; // Skip if too short
        
        generateAndAppend(composeView, content);
    });
}

function showApplyButton(): void {
    if (applyButton) {
        applyButton.style.display = 'block';
        // Reset to apply state when showing button
        isApplied = false;
        applyButton.innerHTML = '✏️ Apply Updated Letter';
        applyButton.style.backgroundColor = '#1a73e8';
    }
}

function hideApplyButton(): void {
    if (applyButton) {
        applyButton.style.display = 'none';
        isApplied = false;
    }
}

function handleButtonClick(): void {
    if (isApplied) {
        undoUpdatedLetter();
    } else {
        applyUpdatedLetter();
    }
}

function applyUpdatedLetter(): void {
    if (!currentComposeView || !updatedLetterContent) {
        console.error('No compose view or updated letter content available');
        return;
    }
    
    try {
        // Store the original content before applying changes
        originalContent = currentComposeView.getHTMLContent();
        
        // Set the body content to the updated letter
        currentComposeView.setBodyHTML(updatedLetterContent.replace(/\n/g, '<br>'));
        
        // Update button state
        isApplied = true;
        
        // Provide visual feedback
        if (applyButton) {
            applyButton!.innerHTML = '↶ Undo';
        }
    } catch (error) {
        console.error('Error applying updated letter:', error);
        if (applyButton) {
            applyButton.innerHTML = '❌ Error';
            applyButton.style.backgroundColor = '#d93025';
            
            setTimeout(() => {
                applyButton!.innerHTML = '✏️ Apply Updated Letter';
                applyButton!.style.backgroundColor = '#1a73e8';
                isApplied = false;
            }, 2000);
        }
    }
}

function undoUpdatedLetter(): void {
    if (!currentComposeView || !originalContent) {
        console.error('No compose view or original content available');
        return;
    }
    
    try {
        // Restore the original content
        currentComposeView.setBodyHTML(originalContent);
        
        // Update button state
        isApplied = false;
        
        // Provide visual feedback
        if (applyButton) {
            applyButton!.innerHTML = 'Apply Updated Letter';
            applyButton!.style.backgroundColor = '#1a73e8';
        }
        
        // Clear the original content since it's been restored
        originalContent = '';
    } catch (error) {
        console.error('Error undoing updated letter:', error);
        if (applyButton) {
            applyButton.innerHTML = 'Error';
            applyButton.style.backgroundColor = '#d93025';
            
            setTimeout(() => {
                applyButton!.innerHTML = '↶ Undo';
                applyButton!.style.backgroundColor = '#ea4335';
            }, 2000);
        }
    }
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