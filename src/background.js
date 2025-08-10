// Background script for Smart Gmail Writer Chrome Extension
// Handles OpenAI API calls and communication with content script
import "@inboxsdk/core/background.js";
import { OpenAI } from 'openai';

// Store active streams per tab
const activeStreams = new Map();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "generateReply") {
    handleGenerateReply(request.threadText, sender.tab.id);
    sendResponse({ success: true, message: "Stream started" });
    return true;
  }
  
  if (request.action === "cancelStream") {
    const stream = activeStreams.get(sender.tab.id);
    if (stream) {
      stream.controller.abort();
      activeStreams.delete(sender.tab.id);
    }
    return true;
  }
});

async function handleGenerateReply(threadText, tabId) {
  try {
    // Get the OpenAI API key from storage
    const result = await chrome.storage.sync.get("openai_key");
    const openaiKey = result.openai_key;

    if (!openaiKey) {
      chrome.tabs.sendMessage(tabId, {
        action: "streamError",
        error: "OpenAI API key not found. Please set it in the extension popup."
      });
      return;
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: openaiKey,
      dangerouslyAllowBrowser: true
    });

    // Create abort controller for this stream
    const controller = new AbortController();
    activeStreams.set(tabId, { controller });

    // Signal start of stream
    chrome.tabs.sendMessage(tabId, { action: "streamStart" });

    // Create streaming completion
    const stream = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert in California landlord-tenant law with a specialization in San Francisco's local ordinances. Your role is to: 1. Review letters from landlords to tenants in San Francisco. You will also receive the tenant's rent roll information. 2. Identify any violations of applicable laws, including the California Civil Code, San Francisco Rent Ordinance, San Francisco Administrative Code, and state/federal fair housing laws.  3. If a violation exists, provide:  - A very concise explanation of the violation (2 short sentences at the most), including the specific law/code section. - A fully compliant, revised version of the letter that preserves the original intent where possible but removes or alters illegal language or requirements. Always produce the output in this exact format: If violations exist: Explanation: [Very concise explanation with citations, 2 short sentences at the most, preferablly 1 sentence] Updated Letter: [Compliant version]  If no violations exist:  Explanation: No violations found. The letter appears compliant with California and San Francisco landlord-tenant laws. If a 24 hour notice is needed to be generated, return in the same string 24hrnoticename (name) 24hrnoticename and 24hrnoticedateandtime (day and time of entering) 24hrnoticedateandtime."
        },
        {
          role: "user",
          content: `Tenant Info: rent: $1,500/month, race: White, unit: 613A  Letter: ${threadText}`
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
      stream: true
    }, {
      signal: controller.signal
    });

    // Stream the response
    for await (const chunk of stream) {
      if (controller.signal.aborted) {
        break;
      }
      
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        chrome.tabs.sendMessage(tabId, {
          action: "streamToken",
          token: content
        });
      }
    }

    // Signal end of stream
    chrome.tabs.sendMessage(tabId, { action: "streamEnd" });
    activeStreams.delete(tabId);

  } catch (error) {
    console.error("Error generating AI reply:", error);
    
    // Send error to content script
    chrome.tabs.sendMessage(tabId, {
      action: "streamError",
      error: `Error: ${error.message}`
    });
    
    // Clean up
    activeStreams.delete(tabId);
  }
}
