// Gemini API wrapper
// Calls the server-side /api/chat endpoint which proxies to Gemini

/**
 * Send a message to Gemini via the server proxy.
 *
 * @param {string} systemPrompt - The system instruction
 * @param {Array<{role: string, text: string}>} history - Previous messages
 * @param {string} userMessage - The new user message
 * @returns {Promise<string>} The model's response text
 * @throws {Error} On network/API errors
 */
export async function sendMessage(systemPrompt, history, userMessage) {
  let response;
  try {
    response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemPrompt, history, userMessage })
    });
  } catch (err) {
    throw new Error('Network error: could not reach the server. Please check your internet connection.');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Server error (${response.status}). Please try again.`);
  }

  if (!data.text) {
    throw new Error('Empty response. Please try again.');
  }

  return data.text;
}

/**
 * Send a one-shot prompt (no history) for tasks like letter generation.
 *
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @returns {Promise<string>}
 */
export async function generateOnce(systemPrompt, userPrompt) {
  return sendMessage(systemPrompt, [], userPrompt);
}
