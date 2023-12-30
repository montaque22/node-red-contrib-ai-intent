const { end } = require("../globalUtils");

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
            response: content?.replaceAll("\n", "").trim(),
          },
        };

        if (tool_calls) {
          tool_calls.forEach((tool) => {
            if (tool.type === "function") {
              payload.args = {
                ...JSON.parse(tool.function.arguments),
              };
              payload.nodeName = tool.function.name;
              output.push(payload);
            }
          });
        } else {
          output.push(payload);
        }

        return payload;
      });

      msg.payload = output;

      send(msg);
      end(done);
    });
  }

  RED.nodes.registerType("OpenAI Response", OpenAIResponseHandlerNode);
};
