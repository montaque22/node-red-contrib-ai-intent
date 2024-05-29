module.exports = function (RED) {
  function GeminiAIConfigNode(prop) {
    RED.nodes.createNode(this, prop);
    this.api = prop.api;
  }
  RED.nodes.registerType("geminiai-configuration", GeminiAIConfigNode);
};
