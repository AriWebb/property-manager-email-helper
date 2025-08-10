// Background script for Smart Gmail Writer Chrome Extension
// Handles OpenAI API calls and communication with content script

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "generateReply") {
    handleGenerateReply(request.threadText, sendResponse);
    return true; // Will respond asynchronously
  }
});

async function handleGenerateReply(threadText, sendResponse) {
  try {
    // Get the OpenAI API key from storage
    const result = await chrome.storage.sync.get("openai_key");
    const openaiKey = result.openai_key;
    
    if (!openaiKey) {
      sendResponse({ 
        success: false, 
        error: "OpenAI API key not found. Please set it in the extension popup." 
      });
      return;
    }

    // Make the API call to OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          { 
            role: "system", 
            content: "You are a helpful email assistant for a property manager. Write professional, concise replies that address the sender's concerns or questions." 
          },
          { 
            role: "user", 
            content: `Reply to this email thread professionally: \n${threadText}` 
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const aiReply = data.choices?.[0]?.message?.content;

    if (aiReply) {
      sendResponse({ 
        success: true, 
        reply: aiReply 
      });
    } else {
      sendResponse({ 
        success: false, 
        error: "Failed to generate AI reply. Please try again." 
      });
    }
  } catch (error) {
    console.error("Error generating AI reply:", error);
    sendResponse({ 
      success: false, 
      error: `Error: ${error.message}` 
    });
  }
}
