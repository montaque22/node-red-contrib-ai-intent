const { TYPES } = require("../constants");
const { end } = require("../globalUtils");
const Ollama = require("ollama").Ollama;
const { ChatController } = require("../utilities/chat-controller");

module.exports = function (RED) {
  function LocalAIChatHandlerNode(config) {
    RED.nodes.createNode(this, config);
    // Retrieve the config node with URL data
    const { url } = RED.nodes.getNode(config.local_settings);
    const node = this;

    async function runFetch(finalProps, controller, send) {
      const { config, msg } = controller;

      const ollama = new Ollama({ host: url });

      try {
        const response = await ollama.chat(finalProps);
        let streamedContent = "";
        let payload = undefined;

        if (config.stream) {
          for await (const part of response) {
            streamedContent += part.message.content;

            const result = { ...part };
            result.message.content = streamedContent;
            payload = {
              ...msg,
              payload: result,
              _debug: { type: controller.node.type },
            };

            if (!part.done) {
              send(payload);
            }
          }

          const finalResult = controller.mergeResponseWithMessage(
            payload.payload,
            finalProps
          );

          return send(finalResult);
        } else {
          const finalResult = controller.mergeResponseWithMessage(
            response,
            finalProps
          );
          return send(finalResult);
        }
      } catch (err) {
        console.error(err);
        throw err;
      }
    }

    this.on("input", function (msg, send, done = () => {}) {
      const controller = new ChatController(node, config, msg, RED);
      const stream = msg?.payload?.stream ?? config.stream;
      const seed = Number(msg?.payload?.seed ?? config.seed);
      const keep_alive = (msg?.payload?.keep_alive ?? config.keep_alive) + "m";
      const useJSONFormat = msg?.payload?.json ?? config.json;
      const format = useJSONFormat ? "json" : undefined;
      send =
        send ||
        function () {
          config.send.apply(node, arguments);
        };

      if (!url) {
        return end(
          done,
          "LocalAI-Chat node requires the url to the server. Please add openaiAPIKey key-value paire to the functionGlobalContext."
        );
      }

      const { apiProperties, toolProperties } = controller;

      const finalProps = {
        ...toolProperties,
        model: apiProperties.model,
        messages: apiProperties.messages,
        options: {
          temperature: apiProperties.temperature,
          max_tokens: apiProperties.max_tokens,
          top_p: apiProperties.top_p,
          frequency_penalty: apiProperties.frequency_penalty,
          presence_penalty: apiProperties.presence_penalty,
          seed,
        },
        stream,
        format,
        keep_alive,
      };

      runFetch(finalProps, controller, send)
        .then(() => {
          end(done);
        })
        .catch((error) => {
          end(done, error);
        });
    });
  }
  RED.nodes.registerType(TYPES.LocalAIChat, LocalAIChatHandlerNode);
};
