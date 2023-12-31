module.exports = function (RED) {
  function OpenAIConfigNode(prop) {
    RED.nodes.createNode(this, prop);
    this.api = prop.api;
  }
  RED.nodes.registerType("openai-configuration", OpenAIConfigNode);
};
