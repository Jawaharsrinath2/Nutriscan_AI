import { request } from "./client";

export const fetchStarterPrompts = () => request("/api/chatbot/starter-prompts");

export const sendChatMessage = (messages, language = "tanglish") =>
  request("/api/chatbot/message", {
    method: "POST",
    body: { messages, language },
  });
