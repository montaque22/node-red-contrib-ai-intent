const { TYPES, TOOL_CHOICE } = require("../constants");
const { ContextDatabase } = require("../globalUtils");
const { ChatLedger } = require("./chat-ledger");

class ChatController {
  constructor(node, config, msg, RED) {
    this.msg = msg;
    this.node = node;
    this.config = config;
    this.apiProperties = getChatCompletionProps(msg, config, node);

    const registeredIntentFunctions = this.getRegisteredIntentFunctions(RED);
    const rawIntents = this.getRawIntents(RED);

    this.tools = [
      ...this.apiProperties.tools,
      ...registeredIntentFunctions,
    ].filter(Boolean);
    const toolProperties = determineToolProperties(
      rawIntents,
      this.tools,
      this.apiProperties.tool_choice
    );

    this.toolProperties = validateToolProperties(toolProperties, node);
  }

  mergeResponseWithMessage = (response, request) => {
    const { user, system, tools, ...rest } = this.msg;
    const ledger = new ChatLedger(this.config.conversation_id, this.node);
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
  getRegisteredIntentFunctions = (RED) => {
    const intents = this.getRawIntents(RED);
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
  getRawIntents = (RED) => {
    const context = new ContextDatabase(RED);
    return context.getNodeStore() || {};
  };
}

/**
 * If no tools exist, then remove tools and toolChoice from the payload
 */
const validateToolProperties = (toolProperties, node) => {
  if (!toolProperties.tools?.length) {
    const { tools, toolChoice, ...rest } = toolProperties;

    if (toolChoice && toolChoice !== TOOL_CHOICE.None) {
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
const getChatCompletionProps = (msg, config, node) => {
  const model = msg.payload?.model || config.model;
  const temperature = Number(msg.payload?.temperature || config.temperature);
  const max_tokens = Number(msg.payload?.max_tokens || config.max_tokens);
  const top_p = Number(msg.payload?.top_p || config.top_p);
  const frequency_penalty = Number(
    msg.payload?.frequency_penalty || config.frequency_penalty
  );
  const presence_penalty = Number(
    msg.payload?.presence_penalty || config.presence_penalty
  );
  const _format = { format: msg.payload?.json || config.json };
  const tools = msg?.tools || [];
  const tool_choice =
    msg.payload?.tool_choice || config?.tool_choice || TOOL_CHOICE.Auto;
  const ledger = new ChatLedger(config.conversation_id, node);
  const messages = ledger.combineExistingMessages(msg.user, msg.system);

  if (!_format.format) {
    delete _format.format;
  } else {
    _format.format = "json";
  }

  return {
    model,
    temperature,
    max_tokens,
    top_p,
    frequency_penalty,
    presence_penalty,
    messages,
    tool_choice,
    tools,
    ..._format,
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
const createFunctionsFromContext = (rawIntents = {}) => {
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
                isRegisteredIntent: { type:"boolean", const: true },
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
  toolChoice = TOOL_CHOICE.Auto
) => {
  const props = {
    tools,
    tool_choice: toolChoice,
  };
  if (toolChoice === TOOL_CHOICE.None || tools.length === 0) {
    // No tools chosen
    return {};
  } else if (toolChoice === TOOL_CHOICE.Auto) {
    // set the choice to auto
    return props;
  } else if (context[toolChoice]?.type === TYPES.OpenAITool) {
    // User chose a specific tool from the dropdown list
    const tool = JSON.parse(context[toolChoice].tool);
    props.tool_choice = {
      type: tool.type,
      function: { name: tool.function.name },
    };

    const doesExist = tools.some((_tool) => {
      return _tool.function.name === tool.function.name;
    });

    if (!doesExist) {
      throw new Error(
        `The OpenAI Tool node "${context[toolChoice].name}" is missing from the flow.`
      );
    }

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
    tool_choice: TOOL_CHOICE.Auto,
  };
};

const createChatEndpoint = (baseURL = "") => {
  return stripTrailingSlash(baseURL) + "/api/chat";
};

const stripTrailingSlash = (str) => {
  return str.endsWith("/") ? str.slice(0, -1) : str;
};

module.exports = {
  ChatController,
  createChatEndpoint,
};
