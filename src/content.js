// Smart Gmail Writer - Clean InboxSDK Implementation
import InboxSDK from '@inboxsdk/core';

console.log('Smart Gmail Writer: Initializing with InboxSDK...');

// Initialize InboxSDK
InboxSDK.load(2, 'smart-gmail-writer-extension').then(function(sdk) {
    console.log('Smart Gmail Writer: InboxSDK loaded successfully');
    
    // Register compose view handler
    sdk.Compose.registerComposeViewHandler(function(composeView) {
        console.log('Smart Gmail Writer: Compose view detected');
        
        // Add AI button to compose toolbar
        composeView.addButton({
            title: '✍️ Write with AI',
            iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTMgMTdIMjFMMTkgMTlIMUwzIDE3WiIgZmlsbD0iIzFhNzNlOCIvPgo8cGF0aCBkPSJNMjAuNzEgNy4wNEMyMS4xIDYuNjUgMjEuMSA2IDIwLjcxIDUuNjNMMTguMzcgMy4yOUMxOCAyLjkgMTcuMzUgMi45IDE2Ljk2IDMuMjlMMTUuMTIgNS4xMkwyMC44OCA4Ljg4TDIwLjcxIDcuMDRaIiBmaWxsPSIjMWE3M2U4Ii8+CjxwYXRoIGQ9Ik0xNC4wNiA2LjE5TDMgMTcuMjVWMjFIOC43NUwxOS44MSA5Ljk0TDE0LjA2IDYuMTlaIiBmaWxsPSIjMWE3M2U4Ii8+Cjwvc3ZnPgo=',
            hasDropdown: false,
            onClick: function(event) {
                console.log('Smart Gmail Writer: AI button clicked');
                handleGenerateReply(composeView);
            }
        });
    });
    
}).catch(function(err) {
    console.error('Smart Gmail Writer: Failed to load InboxSDK:', err);
});

async function handleGenerateReply(composeView) {
    console.log('Smart Gmail Writer: Starting AI reply generation');
    
    try {
        // Get the email thread context
        const threadText = await getEmailThreadText(composeView);
        console.log('Smart Gmail Writer: Retrieved thread text');
        
        // Send request to background script with error handling
        let response;
        try {
            response = await chrome.runtime.sendMessage({
                action: "generateReply",
                threadText: threadText
            });
        } catch (error) {
            if (error.message.includes('Extension context invalidated')) {
                alert('Extension was reloaded. Please refresh Gmail and try again.');
                return;
            }
            throw error;
        }
        
        console.log('Smart Gmail Writer: Received AI response');
        
        if (response && response.success) {
            // Insert the AI-generated reply
            composeView.setBodyText(response.reply);
            console.log('Smart Gmail Writer: Reply inserted successfully');
        } else {
            const errorMsg = response ? response.error : 'No response received';
            console.error('Smart Gmail Writer: Error:', errorMsg);
            alert(`Error: ${errorMsg}`);
        }
        
    } catch (error) {
        console.error('Smart Gmail Writer: Error in reply generation:', error);
        alert('Failed to generate AI reply. Please try again.');
    }
}

async function getEmailThreadText(composeView) {
    console.log('Smart Gmail Writer: Getting email thread context');
    
    try {
        // Get the thread view from the compose view
        const threadView = composeView.getThreadView();
        if (!threadView) {
            console.log('Smart Gmail Writer: No thread view available, using fallback');
            return "No previous email context available";
        }
        
        // Get all message views in the thread
        const messageViews = threadView.getMessageViews();
        console.log(`Smart Gmail Writer: Found ${messageViews.length} messages in thread`);
        
        let threadText = '';
        
        // Extract text from each message (up to last 3 for context)
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
                console.log('Smart Gmail Writer: Could not extract message body:', err);
            }
        }
        
        return threadText.trim() || "No email content found";
        
    } catch (error) {
        console.error('Smart Gmail Writer: Error getting thread text:', error);
        return "Error retrieving email context";
    }
}
