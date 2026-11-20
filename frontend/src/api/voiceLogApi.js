import { request } from "./client";

/**
 * Fetch Tanglish & South Indian quick sample prompts
 */
export const fetchVoiceSamples = () => request("/api/voice-log/samples");

/**
 * Send spoken or typed transcript (Tanglish/Tamil/English) to Gemini / NLP parser
 * @param {string} transcript
 */
export const parseVoiceTranscript = (transcript) =>
  request("/api/voice-log/parse", {
    method: "POST",
    body: { transcript },
  });

/**
 * Confirm parsed meal and log it directly to MealLog in user's daily tracker
 * @param {object} payload { title, slot, items, kcal, protein, carbs, fat, fiber }
 */
export const confirmVoiceMeal = (payload) =>
  request("/api/voice-log/confirm", {
    method: "POST",
    body: payload,
  });
