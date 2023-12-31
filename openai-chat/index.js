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
  const temperature = msg.payload?.temperature || config.temperature;
  const max_tokens = msg.payload?.max_tokens || config.max_tokens;
  const top_p = msg.payload?.top_p || config.top_p;
  const frequency_penalty =
    msg.payload?.frequency_penalty || config.frequency_penalty;
  const presence_penalty =
    msg.payload?.presence_penalty || config.presence_penalty;
  const { user, system } = msg;
  const messages = [system, user];
  const tools = msg?.tools || [];
  const tool_choice = tools.length ? "auto" : "none";

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
      const messages = apiProps.messages.filter(Boolean);
      const { user, system } = msg;
      const tools = [...apiProps.tools, ...registeredIntentFunctions].filter(
        Boolean
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

      const openai = new OpenAI({ apiKey });

      openai.chat.completions
        .create({
          model: apiProps.model,
          messages,
          tools,
          tool_choice: apiProps.tool_choice,
          temperature: apiProps.temperature,
          max_tokens: apiProps.max_tokens,
          top_p: apiProps.top_p,
          frequency_penalty: apiProps.frequency_penalty,
          presence_penalty: apiProps.presence_penalty,
        })
        .then((answer) => {
          msg.payload = answer;
          msg._debug = {
            system,
            tools,
            user,
          };
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
