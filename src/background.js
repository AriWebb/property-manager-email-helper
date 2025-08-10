// Background script for Smart Gmail Writer Chrome Extension
// Handles OpenAI API calls and communication with content script
import "@inboxsdk/core/background.js";
const { generateDocument } = require("./generateNotice.js");

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
        error:
          "OpenAI API key not found. Please set it in the extension popup.",
      });
      return;
    }

    // Make the API call to OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            // content: "You are a helpful email assistant for a property manager. Write professional, concise replies that address the sender's concerns or questions."
            content:
              "You are an expert in California landlord-tenant law with a specialization in San Francisco’s local ordinances. Your role is to: 1. Review letters from landlords to tenants in San Francisco. You will also receive the tenant’s rent roll information. 2. Identify any violations of applicable laws, including the California Civil Code, San Francisco Rent Ordinance, San Francisco Administrative Code, and state/federal fair housing laws.  3. If a violation exists, provide:  - A very concise explanation of the violation (2 short sentences at the most), including the specific law/code section. - A fully compliant, revised version of the letter that preserves the original intent where possible but removes or alters illegal language or requirements. Always produce the output in this exact format: If violations exist: Explanation: [Very concise explanation with citations, 2 short sentences at the most, preferablly 1 sentence] Updated Letter: [Compliant version]  If no violations exist:  Explanation: No violations found. The letter appears compliant with California and San Francisco landlord-tenant laws. If a 24 hour notice is needed to be generated, return in the same string 24hrnoticename (name) 24hrnoticename and 24hrnoticedateandtime (day and time of entering) 24hrnoticedateandtime.",
          },
          {
            role: "user",
            content: `Tenant Info: rent: $1,500/month, race: White, unit: 613A  Letter: Hi Brett, this is your landlord Joe. My wife just left me so now I need money for the ensuing legal battle over our children. Therefore, I will be raising your rent from $1.5k/mo to $8.5k/mo, effective today. Thank you for understanding.`,
            // content: `Tenant Info: rent: $1,500/month, race: White, unit: 613A  Letter: ${threadText}`,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `OpenAI API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const aiReply = data.choices?.[0]?.message?.content;

    const nameMatch = data.choices?.[0]?.message?.content.match(
      /24hrnoticename\s+(.*?)\s+24hrnoticename/
    );
    // Regex to extract the date/time between the 24hrnoticedateandtime tags
    const dateTimeMatch = data.choices?.[0]?.message?.content.match(
      /24hrnoticedateandtime\s+(.*?)\s+24hrnoticedateandtime/
    );

    if (nameMatch && dateTimeMatch) {
      const name = nameMatch[1];
      const dateAndTime = dateTimeMatch[1];

      try {
        // await generateDocument(name, dateAndTime);
        const buffer = await generateDocument(name, dateAndTime);
        console.log("Document created!");

        await currentEmailView.attachFiles([
          {
            name: "24hr-notice.docx",
            mimeType:
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            bytes: new Uint8Array(buffer),
          },
        ]);
        console.log("Document created!");
      } catch (error) {
        console.error("Error generating document:", error);
      }
    } else {
      console.error("Failed to parse variables from ChatGPT response.");
    }
    if (aiReply) {
      sendResponse({
        success: true,
        reply: aiReply,
      });
    } else {
      sendResponse({
        success: false,
        error: "Failed to generate AI reply. Please try again.",
      });
    }
  } catch (error) {
    console.error("Error generating AI reply:", error);
    sendResponse({
      success: false,
      error: `Error: ${error.message}`,
    });
  }
}
