const promptInput = document.getElementById("promptInput");
const compareBtn = document.getElementById("compareBtn");
const statusText = document.getElementById("statusText");
const geminiOutput = document.getElementById("geminiOutput");
const chatgptOutput = document.getElementById("chatgptOutput");

const defaultPrompt =
  "Provide a one-page summary of Microsoft's sustainability initiatives from: https://www.microsoft.com/en-us/corporate-responsibility/sustainability";

promptInput.value = defaultPrompt;

compareBtn.addEventListener("click", async () => {
  const prompt = promptInput.value.trim();

  if (!prompt) {
    setStatus("Please enter a prompt.", true);
    return;
  }

  compareBtn.disabled = true;
  setStatus("Generating with Gemini and ChatGPT...");
  geminiOutput.textContent = "Loading Gemini response...";
  chatgptOutput.textContent = "Loading ChatGPT response...";

  try {
    const response = await fetch("/api/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to compare responses.");
    }

    geminiOutput.textContent = data.gemini || "No Gemini output.";
    chatgptOutput.textContent = data.chatgpt || "No ChatGPT output.";
    setStatus(data.warnings?.length ? data.warnings.join(" | ") : "Done.");
  } catch (err) {
    const message = err?.message || "Unexpected error.";
    geminiOutput.textContent = "Error";
    chatgptOutput.textContent = "Error";
    setStatus(message, true);
  } finally {
    compareBtn.disabled = false;
  }
});

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.style.color = isError ? "#b3261e" : "#4b5c69";
}
