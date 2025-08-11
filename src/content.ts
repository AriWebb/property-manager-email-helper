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
let hasViolation: boolean = false;
let bypassWarning: boolean = false;
let typingTimer: NodeJS.Timeout | null = null;
let lastAnalyzedContent: string = '';
let attachButton: HTMLElement | null = null;
let generatedDocument: { fileData: string; fileName: string; mimeType: string } | null = null;
const TYPING_DELAY = 2000; // 2 seconds after user stops typing

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
    case 'attachFile':
      handleFileAttachment(message.fileData, message.fileName, message.mimeType);
      break;
  }
});

function handleStreamStart(): void {
    streamedContent = '';
    if (currentStreamingElement) {
        currentStreamingElement.innerHTML = 'Analyzing...';
    }
    // Reset generated document and hide attach button on new analysis
    generatedDocument = null;
    hideAttachButton();
}

function handleStreamToken(token: string): void {
    streamedContent += token;
    if (currentStreamingElement) {
        // Parse and clean the response content during streaming
        let cleanedContent = parseAIResponse(streamedContent);
        const htmlContent = convertMarkdownToHTML(cleanedContent);
        currentStreamingElement.innerHTML = htmlContent;
        
        // Add a cursor effect to show it's still streaming
        currentStreamingElement.innerHTML += '<span style="animation: blink 1s infinite;">|</span>';
    }
}

function handleStreamEnd(): void {
    if (currentStreamingElement) {
        // Parse and clean the response content
        let cleanedContent = parseAIResponse(streamedContent);
        const htmlContent = convertMarkdownToHTML(cleanedContent);
        currentStreamingElement.innerHTML = htmlContent;
    }
    streamedContent = '';
}

function convertMarkdownToHTML(content: string): string {
    // Convert **text** to <strong>text</strong>
    let htmlContent = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert line breaks to HTML
    htmlContent = htmlContent.replace(/\n/g, '<br>');
    
    return htmlContent;
}

function parseAIResponse(content: string): string {
    // Extract updated letter content if it exists
    const updatedLetterMatch = content.match(/Updated Letter:\s*([\s\S]*?)(?=ENTRY_INTENT:|$)/i);
    if (updatedLetterMatch) {
        updatedLetterContent = updatedLetterMatch[1].trim();
        hasViolation = true;
        showApplyButton();
    } else {
        updatedLetterContent = '';
        hasViolation = false;
        hideApplyButton();
    }
    
    // Remove "Explanation:" and "Updated Letter:" prefixes
    let cleaned = content;
    
    // Replace "Explanation:" with nothing, but keep the content after it
    cleaned = cleaned.replace(/Explanation:\s*/gi, '');
    
    // Replace "Updated Letter:" with a line break and bold "Updated Letter" text
    cleaned = cleaned.replace(/Updated Letter:\s*/gi, '\n\n**Updated Letter:**\n');
    
    // Remove ENTRY_INTENT, TENANT_NAME, and ENTRY_DATETIME from display
    cleaned = cleaned.replace(/ENTRY_INTENT:\s*(YES|NO)\s*/gi, '');
    cleaned = cleaned.replace(/TENANT_NAME:\s*[^\n]*\s*/gi, '');
    cleaned = cleaned.replace(/ENTRY_DATETIME:\s*[^\n]*\s*/gi, '');
    
    return cleaned.trim();
}

function handleStreamError(error: string): void {
    if (currentStreamingElement) {
        currentStreamingElement.innerHTML = `<span style="color: red;">Error: ${error}</span>`;
    }
    streamedContent = '';
}

function handleFileAttachment(fileData: string, fileName: string, mimeType: string): void {
    try {
        // Store the document data
        generatedDocument = { fileData, fileName, mimeType };
        
        // Show the attach button
        showAttachButton();
        
        // Show notification in the sidebar
        if (currentStreamingElement) {
            const currentContent = currentStreamingElement.innerHTML;
            currentStreamingElement.innerHTML = currentContent + 
                `<br><br><div style="background: #e3f2fd; padding: 8px; border-radius: 4px; color: #1976d2; font-size: 12px;">
                    📄 Notice of Entry document generated and ready to attach
                </div>`;
        }
        
        console.log(`${fileName} generated and ready for attachment`);
    } catch (error) {
        console.error('Error handling file attachment:', error);
        if (currentStreamingElement) {
            const currentContent = currentStreamingElement.innerHTML;
            currentStreamingElement.innerHTML = currentContent + 
                `<br><br><div style="background: #ffebee; padding: 8px; border-radius: 4px; color: #c62828; font-size: 12px;">
                    ❌ Error generating document: ${error instanceof Error ? error.message : 'Unknown error'}
                </div>`;
        }
    }
}

function attachGeneratedDocument(): void {
    try {
        if (!currentComposeView) {
            console.error('No compose view available for file attachment');
            return;
        }

        if (!generatedDocument) {
            console.error('No generated document available');
            return;
        }

        // Convert base64 to blob
        const binaryString = atob(generatedDocument.fileData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Create a File object with the proper filename
        const file = new File([bytes], generatedDocument.fileName, { 
            type: generatedDocument.mimeType 
        });
        
        // Attach the file to the current compose view
        currentComposeView.attachFiles([file]);
        
        console.log(`Successfully attached ${generatedDocument.fileName} to email`);
        
        // Update button state
        if (attachButton) {
            attachButton.innerHTML = '✅ Document Attached';
            attachButton.style.backgroundColor = '#2e7d32';
            (attachButton as HTMLButtonElement).disabled = true;
        }
        
        // Show success notification in the sidebar
        if (currentStreamingElement) {
            const currentContent = currentStreamingElement.innerHTML;
            currentStreamingElement.innerHTML = currentContent + 
                `<br><br><div style="background: #e8f5e8; padding: 8px; border-radius: 4px; color: #2e7d32; font-size: 12px;">
                    ✅ Notice of Entry document attached to email
                </div>`;
        }
    } catch (error) {
        console.error('Error attaching file:', error);
        if (attachButton) {
            attachButton.innerHTML = '❌ Attachment Failed';
            attachButton.style.backgroundColor = '#d32f2f';
            
            setTimeout(() => {
                if (attachButton) {
                    attachButton.innerHTML = '📎 Attach Notice of Entry';
                    attachButton.style.backgroundColor = '#1976d2';
                    (attachButton as HTMLButtonElement).disabled = false;
                }
            }, 2000);
        }
    }
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

          // Create attach button (initially hidden)
          attachButton = document.createElement('button');
          attachButton.id = 'attach-notice-document';
          attachButton.innerHTML = '📎 Attach Notice of Entry';
          attachButton.style.cssText = `
            display: none;
            margin-top: 8px;
            padding: 8px 16px;
            background-color: #1976d2;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            width: 100%;
          `;
          attachButton.addEventListener('click', attachGeneratedDocument);
          attachButton.addEventListener('mouseenter', () => {
            if (!(attachButton as HTMLButtonElement).disabled) {
              attachButton!.style.backgroundColor = '#1565c0';
            }
          });
          attachButton.addEventListener('mouseleave', () => {
            if (!(attachButton as HTMLButtonElement).disabled) {
              attachButton!.style.backgroundColor = '#1976d2';
            }
          });
          
          container.appendChild(summaryDiv);
          container.appendChild(applyButton);
          container.appendChild(attachButton);
          
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
    
    bodyElement.addEventListener('input', () => {
        if (!isEnabled) return;
        
        // Clear existing timer
        if (typingTimer) {
            clearTimeout(typingTimer);
        }
        
        // Set new timer
        typingTimer = setTimeout(() => {
            const content = composeView.getTextContent();
            
            // Only analyze if content is substantial and different from last analysis
            if (content.trim().length >= 10 && content !== lastAnalyzedContent) {
                lastAnalyzedContent = content;
                generateAndAppend(composeView, content);
            }
        }, TYPING_DELAY);
    });

    // Intercept send button to check for violations
    composeView.on('presending', (event: any) => {
        if (hasViolation && !bypassWarning) {
            event.cancel();
            showViolationWarning();
        }
    });
}

function showViolationWarning(): void {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    // Create warning dialog
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white;
        border-radius: 8px;
        padding: 24px;
        max-width: 500px;
        margin: 20px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        text-align: center;
    `;

    dialog.innerHTML = `
        <div style="color: #d93025; font-size: 48px; margin-bottom: 16px;">⚠️</div>
        <h2 style="color: #d93025; margin-bottom: 16px; font-size: 20px;">Potential Legal Violation Detected</h2>
        <p style="margin-bottom: 24px; color: #5f6368; line-height: 1.5;">
            The AI has detected potential violations of California or San Francisco landlord-tenant laws in your email. 
            Sending this email could expose you to legal risks.
        </p>
        <p style="margin-bottom: 32px; color: #5f6368; line-height: 1.5;">
            <strong>Recommendation:</strong> Review the suggested corrections in the sidebar before sending.
        </p>
        <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
            <button id="cancelSend" style="
                background: #1a73e8;
                border: 1px solid #1a73e8;
                color: white;
                padding: 12px 32px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
                font-weight: 500;
            ">Cancel & Review</button>
            <button id="sendAnyway" style="
                background: transparent;
                border: none;
                color: #5f6368;
                padding: 4px 8px;
                border-radius: 2px;
                cursor: pointer;
                font-size: 10px;
                text-decoration: underline;
                font-weight: normal;
                opacity: 0.7;
            ">send anyway</button>
        </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Add event listeners
    const cancelBtn = dialog.querySelector('#cancelSend');
    const sendBtn = dialog.querySelector('#sendAnyway');

    cancelBtn?.addEventListener('click', () => {
        document.body.removeChild(overlay);
    });

    sendBtn?.addEventListener('click', () => {
        document.body.removeChild(overlay);
        // Set bypass flag and trigger send
        bypassWarning = true;
        
        if (currentComposeView) {
            try {
                currentComposeView.send();
                console.log('Send anyway attempted');
                // Reset bypass flag after a short delay
                setTimeout(() => {
                    bypassWarning = false;
                }, 1000);
            } catch (error) {
                console.error('Error sending email:', error);
                bypassWarning = false;
            }
        }
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

function showAttachButton(): void {
    if (attachButton) {
        attachButton.style.display = 'block';
        attachButton.innerHTML = '📎 Attach Notice of Entry';
        attachButton.style.backgroundColor = '#1976d2';
        (attachButton as HTMLButtonElement).disabled = false;
    }
}

function hideAttachButton(): void {
    if (attachButton) {
        attachButton.style.display = 'none';
        (attachButton as HTMLButtonElement).disabled = false;
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
        
        // Set the body content to the updated letter with markdown conversion
        const htmlContent = convertMarkdownToHTML(updatedLetterContent);
        currentComposeView.setBodyHTML(htmlContent);
        
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