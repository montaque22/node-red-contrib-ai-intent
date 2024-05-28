const { jsonrepair } = require("jsonrepair");
const { end, ContextDatabase } = require("../globalUtils");

module.exports = function (RED) {
  function OpenAIFunctionHandlerNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    const globalContext = this.context().global;
    const nodeDB = new ContextDatabase(globalContext, config);

    nodeDB.saveIntent(config);

    this.on("input", function (msg, send, done = () => {}) {
      let content = msg.payload?.tool || config.tool;
      content = content?.replaceAll("\n", "").trim();
      content = jsonrepair(content);

      try {
        content = JSON.parse(content);
      } catch (e) {
        end(done, e);
      }

      if (!msg.tools) {
        msg.tools = [];
      }

      msg.tools.push(content);

      send =
        send ||
        function () {
          node.send.apply(node, arguments);
        };

      send(msg);
      done();
    });

    this.on("close", function (removed, done) {
      if (removed) {
        nodeDB.removeIntent(config);
      } else {
        nodeDB.saveIntent(config);
      }
      end(done);
    });
  }

  RED.nodes.registerType("OpenAI Tool", OpenAIFunctionHandlerNode);
};
