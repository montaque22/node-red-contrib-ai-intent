const OpenAI = require("openai");
const { INTENT_STORE, OPEN_AI_KEY } = require("../constants");
const { end } = require("../globalUtils");

/**
 * converts the key/value of the context into functions that can be used by OpenAI.
 * The key/value pair will be ignored if excludeFromOpenAi is set to true
 */
const createFunctionsFromContext = (context = {}) => {
  return (
    Object.values(context)
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
                isRegisteredIntent: { enum: [true] },
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
 * combines various properties from `msg` and `config` to return all the properties needed for OpenAI API request
 * @param {Record<string,any>} msg
 * @param {Record<string, any>} config
 * @returns
 */
const getChatCompletionProps = (msg, config) => {
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
  const { user, system } = msg;
  const messages = [system, user].filter(Boolean);
  const tools = msg?.tools || [];
  const tool_choice = msg.payload?.tool_choice || config?.tool_choice || "auto";

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
  };
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
    return {};
  } else if (toolChoice === "auto") {
    return props;
  } else if (context[toolChoice].type === "OpenAI Tool") {
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
  } else {
    props.tool_choice = {
      type: "function",
      function: { name: context[toolChoice].name },
    };

    return props;
  }
};

module.exports = function (RED) {
  function OpenAIChatHandlerNode(config) {
    RED.nodes.createNode(this, config);
    // Retrieve the config node with API token data.
    this.token = RED.nodes.getNode(config.token);
    const node = this;

    this.on("input", function (msg, send, done = () => {}) {
      const globalContext = node.context().global;
      const context = globalContext.get(INTENT_STORE) || {};
      const apiKey = node.token?.api || globalContext.get(OPEN_AI_KEY);
      const apiProps = getChatCompletionProps(msg, config);
      const registeredIntentFunctions = createFunctionsFromContext(context);
      const tools = [...apiProps.tools, ...registeredIntentFunctions].filter(
        Boolean
      );
      const toolProps = determineToolProperties(
        context,
        tools,
        apiProps.tool_choice
      );

      send =
        send ||
        function () {
          config.send.apply(node, arguments);
        };

      if (!apiKey) {
        return end(
          done,
          "Api key missing for OpenAI. Please add openaiAPIKey key-value paire to the functionGlobalContext."
        );
      }
      if (!toolProps.tools?.length) {
        delete toolProps.tools;
        delete toolProps.tool_choice;
        node.warn(
          "Removing tools from payload since no tools are available. Flow will continue."
        );
      }
      const openai = new OpenAI({ apiKey });
      const finalProps = {
        ...toolProps,
        model: apiProps.model,
        messages: apiProps.messages,
        temperature: apiProps.temperature,
        max_tokens: apiProps.max_tokens,
        top_p: apiProps.top_p,
        frequency_penalty: apiProps.frequency_penalty,
        presence_penalty: apiProps.presence_penalty,
      };

      openai.chat.completions

        .create(finalProps)
        .then((answer) => {
          msg.payload = answer;
          msg._debug = finalProps;
          delete msg.user;
          delete msg.system;
          delete msg.tools;
          send(msg);
          end(done);
        })
        .catch((err) => {
          end(done, err);
        });
    });
  }

  RED.nodes.registerType("OpenAI Chat", OpenAIChatHandlerNode);
};
