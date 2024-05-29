const { GEMINI_AI_KEY } = require("../constants");
const { end } = require("../globalUtils");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GlobalContext } = require("../utilities/global-context");
const { GeminiController } = require("../utilities/gemini-controller");

module.exports = function (RED) {
  function GeminiAIChatHandlerNode(config) {
    RED.nodes.createNode(this, config);
    // Retrieve the config node with API token data.
    this.token = RED.nodes.getNode(config.token);
    const node = this;

    this.on("input", function (msg, send, done = () => {}) {
      const controller = new GeminiController(node, config, msg, RED);
      const nodeDB = new GlobalContext(node);
      const apiKey =
        node.token?.api || nodeDB.getValueFromGlobalContext(GEMINI_AI_KEY);

      send =
        send ||
        function () {
          config.send.apply(node, arguments);
        };

      if (!apiKey) {
        return end(
          done,
          `Api key missing for Gemini. Please add ${GEMINI_AI_KEY} key-value pair to the functionGlobalContext.
          Or add it to the config within the GeminiAI-Chat node`
        );
      }

      const { apiProperties, toolProperties, tools } = controller;

      const generationConfig = {
        maxOutputTokens: apiProperties.maxOutputTokens,
        temperature: apiProperties.temperature,
        topP: apiProperties.topP,
        topK: apiProperties.topK,
      };

      const finalProps = {
        ...apiProperties,
        ...toolProperties,
      };

      // Access your API key as an environment variable (see "Set up your API key" above)
      const genAI = new GoogleGenerativeAI(apiKey);

      // ...

      // The Gemini 1.5 models are versatile and work with most use cases
      const model = genAI.getGenerativeModel({
        model: finalProps.model,
        generationConfig,
        tools,
      });

      const chat = model.startChat({
        history: finalProps.history,
      });

      chat
        .sendMessage(finalProps.message)
        .then((result) => result.response)
        .then((response) => {
          return {
            functions: response.functionCalls(),
            text: response.text(),
          };
        })
        .then((payload) => {
          send(controller.mergeResponseWithMessage(payload, finalProps));
          end(done);
        })
        .catch((err) => {
          end(done, err);
        });
    });
  }

  RED.nodes.registerType("GeminiAI Chat", GeminiAIChatHandlerNode);
};
