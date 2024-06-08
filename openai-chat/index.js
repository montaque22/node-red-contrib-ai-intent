const OpenAI = require("openai");
const { OPEN_AI_KEY, TYPES } = require("../constants");
const { end } = require("../globalUtils");
const { ChatController } = require("../utilities/chat-controller");
const { GlobalContext } = require("../utilities/global-context");

const STORE = {};

const normalizeNames = (intents = []) => {
  return intents.map((intent) => {
    if (!intent.name && intent.type === TYPES.OpenAITool) {
      const tool = JSON.parse(intent.tool);
      return { ...intent, name: tool.function.name };
    }
    return intent;
  });
};

module.exports = function (RED) {
  function OpenAIChatHandlerNode(config) {
    RED.nodes.createNode(this, config);
    // Retrieve the config node with API token data.
    this.token = RED.nodes.getNode(config.token);
    const node = this;
    this.on("input", function (msg, send, done = () => {}) {
      const controller = new ChatController(node, config, msg, RED);
      const nodeDB = new GlobalContext(node);
      const apiKey =
        node.token?.api || nodeDB.getValueFromGlobalContext(OPEN_AI_KEY);

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

      const { apiProperties, toolProperties } = controller;
      const openai = new OpenAI({ apiKey });
      const finalProps = {
        ...toolProperties,
        model: apiProperties.model,
        messages: apiProperties.messages,
        temperature: apiProperties.temperature,
        max_tokens: apiProperties.max_tokens,
        top_p: apiProperties.top_p,
        frequency_penalty: apiProperties.frequency_penalty,
        presence_penalty: apiProperties.presence_penalty,
      };

      openai.chat.completions
        .create(finalProps)
        .then((answer) => {
          send(controller.mergeResponseWithMessage(answer, finalProps));
          end(done);
        })
        .catch((err) => {
          end(done, err);
        });
    });
  }

  RED.nodes.registerType(TYPES.OpenAIChat, OpenAIChatHandlerNode);
};
