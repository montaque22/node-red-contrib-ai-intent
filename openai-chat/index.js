const OpenAI = require("openai");
const { OPEN_AI_KEY } = require("../constants");
const { end } = require("../globalUtils");
const {
  ChatController,
  getValueFromGlobalContext,
} = require("../utilities/chat-controller");

module.exports = function (RED) {
  function OpenAIChatHandlerNode(config) {
    RED.nodes.createNode(this, config);
    // Retrieve the config node with API token data.
    this.token = RED.nodes.getNode(config.token);
    const node = this;

    this.on("input", function (msg, send, done = () => {}) {
      const controller = new ChatController(node, config, msg, RED);
      const apiKey =
        node.token?.api || getValueFromGlobalContext(OPEN_AI_KEY, node);

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

  RED.nodes.registerType("OpenAI Chat", OpenAIChatHandlerNode);
};
