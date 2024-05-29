const { INTENT_STORE } = require("../constants");
const { ChatLedger } = require("./chat-ledger");
const { GlobalContext } = require("./global-context");

class GeminiController {
  constructor(node, config, msg) {
    this.msg = msg;
    this.node = node;
    this.config = config;
    this.apiProperties = getChatCompletionProps(msg, config, node);

    const registeredIntentFunctions = this.getRegisteredIntentFunctions(node);
    const rawIntents = this.getRawIntents(node);

    this.tools = [
      ...this.apiProperties.tools,
      ...registeredIntentFunctions,
    ].filter(Boolean);

    this.tools = convertToolsToGeminiCompatibleTools(this.tools);

    const toolProperties = determineToolProperties(
      rawIntents,
      this.tools,
      this.apiProperties.tool_choice
    );

    this.toolProperties = validateToolProperties(toolProperties, node);
  }

  mergeResponseWithMessage = (payload, request) => {
    const { user, system, tools, ...rest } = this.msg;
    const ledger = new ChatLedger(this.config.conversation_id, this.node);
    const response = {
      functions: payload.functions,
      message: { role: "assistant", content: payload.text },
    };
    const fullConversation = ledger.addResponseToConversationAndSave(
      request,
      response,
      this.node.type
    );

    return {
      ...rest,
      payload: response,
      _debug: {
        ...request,
        type: this.node.type,
        fullConversation,
        conversation_id: this.config.conversation_id,
      },
    };
  };

  /**
   * Converts the raw intents into functions that the LLM can use.
   * @param {*} node
   * @returns
   */
  getRegisteredIntentFunctions = (node) => {
    const intents = this.getRawIntents(node);
    return createFunctionsFromContext(intents);
  };

  /**
   * This will return all stored Registered Intents throughout the entire system
   * and Tool Nodes that are attached directly to this flow
   * This will return:
   *  type RawIntent = {
   *    [node_id]: node // could be Registered Intent or Tool node
   *  }
   */
  getRawIntents = (node) => {
    const globalContext = new GlobalContext(node);
    return globalContext.getValueFromGlobalContext(INTENT_STORE) || {};
  };
}

/**
 * If no tools exist, then remove tools and toolChoice from the payload
 */
validateToolProperties = (toolProperties, node) => {
  if (!toolProperties.tools?.length) {
    const { tools, toolChoice, ...rest } = toolProperties;

    if (toolChoice && toolChoice !== "none") {
      node.warn(
        "Removing tools from payload since no tools are available. Flow will continue."
      );
    }

    return rest;
  }
  return toolProperties;
};

/**
 * combines various properties from `msg` and `config` to return all the properties needed for OpenAI API request
 * @param {Record<string,any>} msg
 * @param {Record<string, any>} config
 * @returns
 */
getChatCompletionProps = (msg, config, node) => {
  const model = msg.payload?.model || config.model;
  const temperature = Number(msg.payload?.temperature || config.temperature);
  const max_tokens = Number(msg.payload?.max_tokens || config.max_tokens);
  const top_p = Number(msg.payload?.top_p || config.top_p);
  const top_k = Number(msg.payload?.top_k || config.top_k);
  const tools = msg?.tools || [];
  const tool_choice = msg.payload?.tool_choice || config?.tool_choice || "auto";
  const ledger = new ChatLedger(config.conversation_id, node);
  const messages = ledger.combineExistingMessages(msg.user, msg.system);
  const { updated, original } = convertChatToGeminiCompatibleChat(messages);
  const history = [...updated];
  const nextMessage = history.pop();
  const message = nextMessage?.parts[0]?.text || "";

  return {
    model,
    temperature,
    maxOutputTokens: max_tokens,
    topP: top_p,
    topK: top_k,
    messages: original, // contains  the full chat in it's original form
    history, // contains the gemini compatible chat w/o the user's current message (the last message in the array)
    message,
    tool_choice,
    tools,
  };
};

convertChatToGeminiCompatibleChat = (messages = []) => {
  const original = [...messages];
  const updated = messages.map((message) => {
    let role = message.role;
    // Gemini doesn't seem to have a system role. We wil convert it to a user
    if (role === "system") {
      role = "user";
    }

    return { role, parts: [{ text: message.content }] };
  });
  return { original, updated };
};

convertToolsToGeminiCompatibleTools = (tools = []) => {
  return {
    functionDeclarations: tools.map((tool) => {
      return tool.function;
    }),
  };
};

/**
 * converts the registered intents stored in the context into functions that can be used by the LLM.
 * The registered intent will be ignored if excludeFromOpenAi is set to true.
 * rawIntents may have tool nodes included so the values need to be filtered by the node type.
 * rawIntents have the following shape:
 *
 * type RawIntents = {
 *  [node_id]: node // node could be Registered Intent or Tool node
 * }
 */
createFunctionsFromContext = (rawIntents = {}) => {
  return (
    Object.values(rawIntents)
      .filter((payload) => {
        return payload.type === "Register Intent";
      })
      .map((payload) => {
        if (payload.excludeFromOpenAi) {
          return undefined;
        }

        return {
          type: "function",
          function: {
            name: payload.name,
            description: payload.description,
            parameters: {
              type: "object",
              properties: {
                isRegisteredIntent: { type: "boolean", enum: ["true"] },
                response: {
                  type: "string",
                  description: "A friendly response to the given command",
                },
              },
              required: ["isRegisteredIntent", "response"],
            },
          },
        };
      })
      .filter(Boolean) || []
  );
};

/**
 * Based on the tool_choice the tool properties will be created. This is based off
 * https://cookbook.openai.com/examples/how_to_call_functions_with_chat_models
 *
 * @param {Object} context - contains all the saved nodes that represents functions
 * @param {*} tools - All the tools to be sent as functions
 * @param {*} toolChoice - Specifies which tools to use
 * @returns
 */
const determineToolProperties = (
  context = {},
  tools = [],
  toolChoice = "auto"
) => {
  const props = {
    tools,
    tool_choice: toolChoice,
  };
  if (toolChoice === "none") {
    // No tools chosen
    return {};
  } else if (toolChoice === "auto") {
    // set the choice to auto
    return props;
  } else if (context[toolChoice]?.name) {
    // ???
    props.tool_choice = {
      type: "function",
      function: { name: context[toolChoice].name },
    };

    return props;
  }
  // Something funky happened so we will use auto instead
  return {
    tools,
    tool_choice: "auto",
  };
};

module.exports = {
  GeminiController,
};
