const CHAT_SAFETY_URL = process.env.CHAT_SAFETY_URL || "http://chat-safety-service:8000";

export const analyzeSafety = async (text, messageId = null, senderId = null) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${CHAT_SAFETY_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, senderId, text }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.error("Chat safety service error:", response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Chat safety analysis failed:", error.message);
    return null;
  }
};
