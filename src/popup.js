// Popup script for Smart Gmail Writer Chrome Extension
// Handles API key storage and UI interactions

// Load existing API key on popup open
chrome.storage.sync.get("openai_key", (result) => {
  console.log("Stored API key:", result.openai_key ? "Found (starts with: " + result.openai_key.substring(0, 10) + "...)" : "Not found");
  if (result.openai_key) {
    document.getElementById("key").value = result.openai_key;
    showStatus("API key loaded", "success");
  }
});

document.getElementById("save").onclick = () => {
  const val = document.getElementById("key").value.trim();
  
  if (!val) {
    showStatus("Please enter an API key", "error");
    return;
  }
  
  if (!val.startsWith("sk-")) {
    showStatus("Invalid API key format. Should start with 'sk-'", "error");
    return;
  }
  
  chrome.storage.sync.set({ openai_key: val }, () => {
    showStatus("API key saved successfully!", "success");
  });
};

function showStatus(message, type) {
  const statusDiv = document.getElementById("status");
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = "block";
  
  if (type === "success") {
    setTimeout(() => {
      statusDiv.style.display = "none";
    }, 3000);
  }
}
