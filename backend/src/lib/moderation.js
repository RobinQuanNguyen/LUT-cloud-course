// helper file for content moderation (python microservice)
const MODERATION_URL = "http://moderation-service:8000/moderate";

export const moderateText = async (text) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000); // 3 second timeout

        const response = await fetch(MODERATION_URL, {
            method: "POST",
            headers: {"Content-Type": "application/json" },
            body: JSON.stringify({ text }),
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (!response.ok)
            return { flagged: false, reason: "Moderation service error" }; // fallback to allow message if moderation service fails
        
        return await response.json();
    } catch (error) {
        console.error("Moderation service error:", error.message);
        return { flagged: false}; // Better to allow message than break chat functionality
    }
}