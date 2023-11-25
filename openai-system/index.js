const Sugar = require("sugar");

module.exports = function (RED) {
  function OpenAISystemHandlerNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    this.on("input", function (msg, send, done = () => {}) {
      let content = msg.payload?.instruction || config.instruction;

      // performs the string substitutions
      content = Sugar.String.format(content, msg);

      send =
        send ||
        function () {
          node.send.apply(node, arguments);
        };

      msg.system = { role: "system", content };
      send(msg);
      done();
    });
  }

  RED.nodes.registerType("OpenAI System", OpenAISystemHandlerNode);
};
