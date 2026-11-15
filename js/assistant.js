
const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000/api"
    : "/api";

/**
 * Send conversation messages to the ARES backend.
 */
export async function sendAssistantMessage(messages) {
  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.error || `Request failed with status ${response.status}`
      );
    }

    return {
      success: true,
      answer: data.answer,
      model: data.model,
    };

  } catch (error) {
    console.error("ARES Assistant request failed:", error);

    throw new Error(
      error.message || "Unable to connect to ARES AI backend."
    );
  }
}

/**
 * Check whether the ARES backend is available.
 */
export async function checkAssistantServer() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();

    return response.ok && data.success === true;

  } catch (error) {
    console.error("ARES Assistant health check failed:", error);
    return false;
  }
}
