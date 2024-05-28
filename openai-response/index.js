const { end } = require("../globalUtils");
const Sugar = require("sugar");
const { ChatLedger } = require("../utilities/chat-ledger");

module.exports = function (RED) {
  function OpenAIResponseHandlerNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    this.conversation_id = config.conversation_id;

    /**
     * Returns a formatted string based on the settings of the node
     * @param {object} node - represents the current node and it's settings
     * @param {string} content - the string response that came back from GPT
     * @returns
     */
    const getResponse = (node, content = "") => {
      if (node.keepFormatting) {
        return content;
      }
      return content?.replaceAll("\n", "").trim();
    };

    const createConsistentPayload = (content) => {
      return {
        args: {
          response: getResponse(config, content),
        },
      };
    };

    const formatPayloadForLocalAI = (msg) => {
      const { message } = msg.payload;
      return [createConsistentPayload(message.content)];
    };

    const formatPayloadForOpenAI = (msg) => {
      const output = [];
      // Goes through the OpenAI Response and creates a standard uniformed output
      msg.payload.choices.forEach((answer) => {
        const { content = "", tool_calls } = answer.message;
        const payload = createConsistentPayload(content);

        if (tool_calls) {
          tool_calls.forEach((tool) => {
            const deepCopyPayload = Sugar.Object.clone(payload, true);

            if (tool.type === "function") {
              deepCopyPayload.args = {
                ...JSON.parse(tool.function.arguments),
              };
              deepCopyPayload.nodeName = tool.function.name;
              output.push(deepCopyPayload);
            }
          });
        } else {
          output.push(payload);
        }
      });

      return output;
    };

    this.on("input", function (msg, send, done = () => {}) {
      send =
        send ||
        function () {
          node.send.apply(node, arguments);
        };

      msg.originalResponse = msg.payload;

      switch (msg._debug.type) {
        case "OpenAI Chat": {
          msg.payload = formatPayloadForOpenAI(msg);
          break;
        }
        case "LocalAI Chat": {
          msg.payload = formatPayloadForLocalAI(msg);
          break;
        }
        default:
          node.warn(
            `Not sure where ${msg._debug.type} came from but it isn't supported`
          );
      }

      if (config.clearConversation || msg.clearConversation) {
        const ledger = new ChatLedger(msg._debug.conversation_id, node);
        msg._debug.previousConversation = msg._debug.fullConversation;
        msg._debug.fullConversation = ledger.clearConversation();
      }

      send(msg);
      end(done);
    });
  }

  RED.nodes.registerType("OpenAI Response", OpenAIResponseHandlerNode);
};
