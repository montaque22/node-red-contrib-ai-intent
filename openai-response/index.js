const { end } = require("../globalUtils");
const Sugar = require("sugar");

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

module.exports = function (RED) {
  function OpenAIResponseHandlerNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    this.on("input", function (msg, send, done = () => {}) {
      send =
        send ||
        function () {
          node.send.apply(node, arguments);
        };
      msg.originalResponse = msg.payload;
      const output = [];
      // Goes through the OpenAI Response and creates a standard uniformed output
      msg.payload.choices.forEach((answer) => {
        const { content = "", tool_calls } = answer.message;

        const payload = {
          args: {
            response: getResponse(config, content),
          },
        };

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

      msg.payload = output;

      send(msg);
      end(done);
    });
  }

  RED.nodes.registerType("OpenAI Response", OpenAIResponseHandlerNode);
};
