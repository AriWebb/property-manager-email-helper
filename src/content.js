// Smart Gmail Writer - Simplified InboxSDK Implementation
const InboxSDK = require('@inboxsdk/core');

console.log('Smart Gmail Writer: Starting InboxSDK initialization...');

// Simple InboxSDK initialization
InboxSDK.load(2, 'sdk_propertymanage_f1f1c36d4b').then(function(sdk) {
    console.log('Smart Gmail Writer: InboxSDK initialized successfully');
    
    // Register compose view handler
    sdk.Compose.registerComposeViewHandler(function(composeView) {
        console.log('Smart Gmail Writer: Compose view detected');
        
        // Add AI button to compose toolbar
        composeView.addButton({
            title: '✍️ Write with AI',
            iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTMgMTdIMjFMMTkgMTlIMUwzIDE3WiIgZmlsbD0iIzFhNzNlOCIvPgo8cGF0aCBkPSJNMjAuNzEgNy4wNEMyMS4xIDYuNjUgMjEuMSA2IDIwLjcxIDUuNjNMMTguMzcgMy4yOUMxOCAyLjkgMTcuMzUgMi45IDE2Ljk2IDMuMjlMMTUuMTIgNS4xMkwyMC44OCA4Ljg4TDIwLjcxIDcuMDRaIiBmaWxsPSIjMWE3M2U4Ii8+CjxwYXRoIGQ9Ik0xNC4wNiA2LjE5TDMgMTcuMjVWMjFIOC43NUwxOS44MSA5Ljk0TDE0LjA2IDYuMTlaIiBmaWxsPSIjMWE3M2U4Ii8+Cjwvc3ZnPgo=',
            hasDropdown: false,
            onClick: function() {
                console.log('Smart Gmail Writer: AI button clicked');
                handleGenerateReply(composeView);
            }
        });
    });
    
}).catch(function(err) {
    console.error('Smart Gmail Writer: InboxSDK failed to load:', err);
});

async function handleGenerateReply(composeView) {
    console.log('Smart Gmail Writer: Generating AI reply...');
    
    try {
        // Get email thread context
        const threadText = getEmailThreadText(composeView);
        console.log('Smart Gmail Writer: Thread text extracted');
        
        // Send to background script for AI generation
        const response = await chrome.runtime.sendMessage({
            action: "generateReply",
            threadText: threadText
        });
        
        if (response && response.success) {
            composeView.setBodyText(response.reply);
            console.log('Smart Gmail Writer: AI reply inserted');
        } else {
            alert(`Error: ${response?.error || 'Failed to generate reply'}`);
        }
        
    } catch (error) {
        console.error('Smart Gmail Writer: Error:', error);
        alert('Failed to generate AI reply. Please try again.');
    }
}

function getEmailThreadText(composeView) {
    try {
        const threadView = composeView.getThreadView();
        if (!threadView) {
            return "No previous email context available";
        }
        
        const messageViews = threadView.getMessageViews();
        let threadText = '';
        
        // Get last 3 messages for context
        const recentMessages = messageViews.slice(-3);
        for (const messageView of recentMessages) {
            try {
                const messageBody = messageView.getBodyElement();
                if (messageBody) {
                    const text = messageBody.innerText || messageBody.textContent;
                    if (text && text.trim()) {
                        threadText += `\n---\n${text.trim()}`;
                    }
                }
            } catch (err) {
                console.log('Smart Gmail Writer: Could not extract message:', err);
            }
        }
        
        return threadText.trim() || "No email content found";
        
    } catch (error) {
        console.error('Smart Gmail Writer: Error getting thread text:', error);
        return "Error retrieving email context";
    }
}