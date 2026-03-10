import arcjet, { detectBot, shield, slidingWindow } from "@arcjet/node";
import { ENV } from "./env.js";

const fallbackDecision = {
  isDenied: () => false,
  results: [],
  reason: {
    isRateLimit: () => false,
    isBot: () => false,
  },
};

const aj = ENV.ARCJET_KEY
  ? arcjet({
      key: ENV.ARCJET_KEY,
      rules: [
        shield({ mode: "LIVE" }),
        detectBot({
          mode: "LIVE",
          allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:TOOL"],
        }),
        slidingWindow({
          mode: "LIVE",
          max: 100,
          interval: 60,
        }),
      ],
    })
  : {
      protect: async () => fallbackDecision,
    };

export default aj;