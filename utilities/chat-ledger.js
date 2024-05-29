const { CONVERSATION_CONTEXT } = require("../constants");
const { GlobalContext } = require("./global-context");

class ChatLedger {
  constructor(id = "", node) {
    this.id = id;
    this.node = node;
  }

  addResponseToConversationAndSave = (
    request,
    response,
    type = "OpenAI Chat"
  ) => {
    const conversation = [];

    request.messages.forEach((message) => {
      conversation.push(message);
    });

    if (type === "OpenAI Chat") {
      response.choices.forEach(({ message }) => {
        const { role, content = "" } = message;
        conversation.push({ role, content });
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
      combined[0] = system;
    } else if (system) {
      combined = [system, ...combined];
    }

    return combined;
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
