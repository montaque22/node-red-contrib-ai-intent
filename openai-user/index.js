const Sugar = require("sugar");
const { TYPES, ROLES } = require("../constants");

module.exports = function (RED) {
  function OpenAIUserHandlerNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    this.on("input", function (msg, send, done = () => {}) {
      let content = msg.payload?.content || config.content;
      content = Sugar.String.format(content, msg);

      send =
        send ||
        function () {
          node.send.apply(node, arguments);
        };

      msg.user = { role: ROLES.User, content };
      send(msg);
      done();
    });
  }

  RED.nodes.registerType(TYPES.OpenAIUser, OpenAIUserHandlerNode);
};
