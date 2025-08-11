// Background script for Smart Gmail Writer Chrome Extension
// Handles OpenAI API calls and communication with content script
import "@inboxsdk/core/background.js";
import { OpenAI } from 'openai';

// Store active streams per tab
const activeStreams = new Map();
const axios = require("axios");

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
          content: "You are an expert in California landlord-tenant law with a specialization in San Francisco's local ordinances. Your role is to: 1. Review letters from landlords to tenants in San Francisco. You will also receive the tenant's rent roll information. 2. Identify any violations of applicable laws, including the California Civil Code, San Francisco Rent Ordinance, San Francisco Administrative Code, and state/federal fair housing laws. 3. If a violation exists, provide: - A very concise explanation of the violation (2 short sentences at the most), including the specific law/code section. - A fully compliant, revised version of the letter that preserves the original intent where possible but removes or alters illegal language or requirements. 4. Determine if the landlord intends to enter the tenant's unit based on the letter content. Always produce the output in this exact format: If violations exist: Explanation: [Very concise explanation with citations, 2 short sentences at the most, preferably 1 sentence] Updated Letter: [Compliant version] If no violations exist: Explanation: No violations found. The letter appears compliant with California and San Francisco landlord-tenant laws. Additionally, if the landlord indicates they will enter the unit, add: ENTRY_INTENT: YES TENANT_NAME: [tenant name from letter] ENTRY_DATETIME: [specific date and time mentioned for entry] If no entry is mentioned, add: ENTRY_INTENT: NO"
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
    // Store full response for parsing entry intent
    let fullResponse = '';
    
    // Stream the response
    for await (const chunk of stream) {
      if (controller.signal.aborted) {
        break;
      }
      
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        chrome.tabs.sendMessage(tabId, {
          action: "streamToken",
          token: content
        });
      }
    }

    // Signal end of stream
    chrome.tabs.sendMessage(tabId, { action: "streamEnd" });
    activeStreams.delete(tabId);

    // Parse the response for entry intent
    const entryIntentMatch = fullResponse.match(/ENTRY_INTENT:\s*(YES|NO)/i);
    const tenantNameMatch = fullResponse.match(/TENANT_NAME:\s*(.+?)(?:\n|$)/i);
    const entryDateTimeMatch = fullResponse.match(/ENTRY_DATETIME:\s*(.+?)(?:\n|$)/i);

    if (entryIntentMatch && entryIntentMatch[1].toUpperCase() === 'YES' && tenantNameMatch && entryDateTimeMatch) {
      try {
        const tenantName = tenantNameMatch[1].trim();
        const entryDateTime = entryDateTimeMatch[1].trim();
        
        console.log('Generating 24-hour notice for:', { name: tenantName, dateandtime: entryDateTime });
        
        const response2 = await axios.post(
          "https://us-central1-propertymanager-66f54.cloudfunctions.net/generateWordDoc",
          {
            name: tenantName,
            dateandtime: entryDateTime,
          },
          {
            headers: {
              Authorization: `Bearer 123`,
            },
          }
        );

        // Download the file from the response URL
        if (response2.data && response2.data.message) {
          const fileResponse = await axios.get(response2.data.message, {
            responseType: 'blob'
          });
          
          // Convert blob to array buffer then to base64 for transfer
          const arrayBuffer = await fileResponse.data.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          
          // Send the file to content script for attachment
          chrome.tabs.sendMessage(tabId, {
            action: "attachFile",
            fileData: base64,
            fileName: "Notice of Entry.docx",
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          });
        }
      } catch (error) {
        console.error("Error generating or downloading notice:", error);
        chrome.tabs.sendMessage(tabId, {
          action: "streamError",
          error: `Error generating notice: ${error.message}`
        });
      }
    }
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
