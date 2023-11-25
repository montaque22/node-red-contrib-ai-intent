const OpenAI = require("openai");
const { INTENT_STORE, OPEN_AI_KEY } = require("../constants");
const { end } = require("../globalUtils");

/**
 * converts the key/value of the context into functions that can be used by OpenAI.
 * The key/value pair will be ignored if excludeFromOpenAi is set to true
 */
const createFunctionsFromContext = (context = {}) => {
  return (
    Object.keys(context)
      .map((key) => {
        const payload = context[key];

        if (payload.excludeFromOpenAi) {
          return undefined;
        }

        return {
          type: "function",
          function: {
            name: key,
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

module.exports = function (RED) {
  function OpenAIChatHandlerNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    this.on("input", function (msg, send, done = () => {}) {
      const globalContext = node.context().global;
      const context = globalContext.get(INTENT_STORE) || {};
      const apiKey = globalContext.get(OPEN_AI_KEY);
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
      const registeredIntentFunctions = createFunctionsFromContext(context);
      const _tools = msg?.tools || [];
      const tools = [..._tools, ...registeredIntentFunctions].filter(Boolean);
      const tool_choice = tools.length ? "auto" : "none";

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
          model,
          messages: messages.filter(Boolean),
          tools,
          tool_choice,
          temperature,
          max_tokens,
          top_p,
          frequency_penalty,
          presence_penalty,
        })
        .then((answer) => {
          msg.payload = answer;
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
