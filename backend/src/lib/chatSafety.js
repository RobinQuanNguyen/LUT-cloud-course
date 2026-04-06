export async function analyzeMessageRisk(message) {
  const serviceUrl = process.env.CHAT_SAFETY_SERVICE_URL || "http://chat-safety-service:8000";

  const response = await fetch(`${serviceUrl}/risk/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messageId: message.messageId || null,
      senderId: message.senderId || null,
      text: message.text || "",
    }),
  });

  if (!response.ok) {
    throw new Error(`chat-safety-service error: ${response.status}`);
  }

  return await response.json();
}