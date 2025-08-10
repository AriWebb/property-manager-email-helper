function injectReplyButton() {
    const observer = new MutationObserver(() => {
        const replyBox = document.querySelector('[aria-label="Message Body"]');
        if (replyBox && !document.querySelector('#ai-reply-btn')) {
        const btn = document.createElement('button');
        btn.id = 'ai-reply-btn';
        btn.innerText = '✍️ Write with AI';
        btn.style = 'margin-top:10px;padding:6px 12px;background:#007bff;color:white;border:none;border-radius:4px;cursor:pointer;';
        btn.onclick = () => handleGenerateReply(replyBox);
        replyBox.parentElement.appendChild(btn);
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

injectReplyButton();

function getEmailThread() {
    // Try multiple selectors to get email content more reliably
    const selectors = [
        '.a3s.aiL',
        '[data-message-id] .ii.gt .a3s',
        '.ii.gt .a3s',
        '.adn.ads .a3s'
    ];
    
    let text = '';
    
    for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
            elements.forEach(element => {
                const content = element.innerText || element.textContent;
                if (content && content.trim()) {
                    text += content.trim() + "\n\n";
                }
            });
            break; // Use the first selector that finds content
        }
    }
    
    // Fallback: try to get the currently visible email
    if (!text.trim()) {
        const visibleEmail = document.querySelector('[role="main"] .a3s');
        if (visibleEmail) {
            text = visibleEmail.innerText || visibleEmail.textContent || '';
        }
    }
    
    return text.trim() || "No email content found";
}

function insertReply(replyBox, text) {
    const event = new InputEvent('input', { bubbles: true });
    replyBox.innerText = text;
    replyBox.dispatchEvent(event);
}

async function handleGenerateReply(replyBox) {
    const threadText = getEmailThread();
    
    // Show loading state
    const btn = document.querySelector('#ai-reply-btn');
    const originalText = btn.innerText;
    btn.innerText = '⏳ Generating...';
    btn.disabled = true;

    try {
        // Send message to background script to generate reply
        const response = await chrome.runtime.sendMessage({
            action: "generateReply",
            threadText: threadText
        });

        if (response.success) {
            insertReply(replyBox, response.reply);
        } else {
            alert(`Error: ${response.error}`);
        }
    } catch (error) {
        console.error("Error communicating with background script:", error);
        alert("Failed to generate AI reply. Please try again.");
    } finally {
        // Restore button state
        btn.innerText = originalText;
        btn.disabled = false;
    }
}