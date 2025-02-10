module.exports = function (RED) {
  function PlatformConfigurationNode(prop) {
    RED.nodes.createNode(this, prop);
    this.url = prop.url;
    this.platform = prop.platform;
    this.name = prop.name;
    this.model = prop.model;
  }

  RED.nodes.registerType("platform-configuration", PlatformConfigurationNode, {
    credentials: {
      api: {type:"text"}
    }
  });
};
