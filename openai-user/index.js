module.exports = function (RED) {
  function OpenAIUserHandlerNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    this.on("input", function (msg, send, done = () => {}) {
      const content = msg.payload?.instruction || config.instruction;

      send =
        send ||
        function () {
          node.send.apply(node, arguments);
        };

      msg.user = { role: "user", content };
      send(msg);
      done();
    });
  }

  RED.nodes.registerType("OpenAI User", OpenAIUserHandlerNode);
};
