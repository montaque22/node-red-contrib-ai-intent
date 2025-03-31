module.exports = {
  OPEN_AI_KEY: "openaiAPIKey",
  GEMINI_AI_KEY: "geminiaiAPIKey",
  LOCAL_STORAGE_PATH: "localStoragePath",
  INTENT_STORE: "intent_store",
  ACTIVE_CONVERSATION: "active_conversation_context",
  CONVERSATION_CONTEXT: "conversation_context",
  TYPES: {
    RegisterIntent: "Register Intent",
    CallIntent: "Call Intent",
    OpenAIChat: "OpenAI Chat",
    LLMChat: "LLM Chat",
    LocalAIChat: "LocalAI Chat",
    GeminiaiChat: "GeminiAI Chat",
    OpenAITool: "OpenAI Tool",
    OpenAIUser: "OpenAI User",
    OpenAISystem: "OpenAI System",
    OpenAIResponse: "OpenAI Response",
  },
  ROLES: {
    User: "user",
    System: "system",
    Assistant: "assistant",
    Tool: "tool"
  },
  TOOL_CHOICE: {
    Any: "any",
    None: "none",
    Auto: "auto",
    Required: "required"
  },
};
