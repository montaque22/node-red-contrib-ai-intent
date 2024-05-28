module.exports = function (RED) {
  function LocalAIConfigNode(prop) {
    RED.nodes.createNode(this, prop);
    this.url = prop.url;
  }
  RED.nodes.registerType("localai-configuration", LocalAIConfigNode);
};
