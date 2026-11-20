from typing import List, Optional
from pydantic import BaseModel, Field

class ChatMessage(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    language: Optional[str] = "tanglish"  # "tanglish" | "english"

class ChatResponse(BaseModel):
    reply: str
    suggested_followups: List[str] = []

class StarterPrompt(BaseModel):
    id: str
    icon: str
    label: str
    prompt: str
