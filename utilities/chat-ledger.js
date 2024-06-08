const { CONVERSATION_CONTEXT, TYPES } = require("../constants");
const { GlobalContext } = require("./global-context");

class ChatLedger {
  constructor(id = "", node) {
    this.id = id;
    this.node = node;
  }

  addResponseToConversationAndSave = (
    request,
    response,
    type = TYPES.OpenAIChat
  ) => {
    const conversation = [];

    request.messages.forEach((message) => {
      conversation.push(message);
    });

    if (type === TYPES.OpenAIChat) {
      response.choices.forEach(({ message }) => {
        const { role, content = "", tool_calls } = message;

        if (content) {
          conversation.push({ role, content });
        } else if (tool_calls) {
          const toolMessage = tool_calls.reduce((message, tool) => {
            return `${message} ${JSON.stringify(
              tool.function.arguments,
              null,
              2
            )}`;
          }, "");
          conversation.push({ role, content: toolMessage });
        }
      });
    } else {
      const { role, content = "" } = response.message;
      conversation.push({ role, content });
    }

    return this.saveConversation(conversation);
  };

  combineExistingMessages = (userOrAssistant, system) => {
    const existingConversation = this.getConversation();
    let combined = [...existingConversation, userOrAssistant];

    if (existingConversation[0]?.role === "system" && system) {
      //Replace the existing system with the new system
      combined[0] = system;
    } else if (system) {
      // Add the system to the beginning of the array
      combined = [system, ...combined];
    }

    // Remove entries with empty content. API breaks if content is empty
    return combined
      .map((conversation) => {
        if (conversation.content) {
          return conversation;
        }
      })
      .filter(Boolean);
  };

  clearConversation = () => {
    const { id, node } = this;
    if (!id) {
      this.node.warn(
        `No conversation id is present on the . Cannot clear conversation`
      );
      return [];
    }
    const globalContext = new GlobalContext(node);
    const conversations =
      globalContext.getValueFromGlobalContext(CONVERSATION_CONTEXT) || {};

    conversations[id] = [];

    globalContext.setValueToGlobalContext(conversations, CONVERSATION_CONTEXT);

    return conversations[id];
  };

  getConversation = () => {
    const { id = "", node } = this;

    if (!id) {
      return [];
    }

    const globalContext = new GlobalContext(node);
    const conversations =
      globalContext.getValueFromGlobalContext(CONVERSATION_CONTEXT) || {};

    return conversations[id] || [];
  };

  saveConversation = (conversation = []) => {
    const { id, node } = this;

    if (!id) {
      return conversation;
    }

    const globalContext = new GlobalContext(node);
    const conversations =
      globalContext.getValueFromGlobalContext(CONVERSATION_CONTEXT) || {};

    conversations[id] = conversation;

    globalContext.setValueToGlobalContext(conversations, CONVERSATION_CONTEXT);

    return conversation;
  };
}

module.exports = {
  ChatLedger,
};
