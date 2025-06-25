const PubSub = require("pubsub-js");
const { getErrorMessagesForConfig } = require("./utils");
const { end, ContextDatabase } = require("../globalUtils");
const {validateOpenAISchema} = require("../utilities/validateSchema")

module.exports = function (RED) {
  function RegisterIntentHandlerNode(config) {
    RED.nodes.createNode(this, config);

    const errorMessage = getErrorMessagesForConfig(config);
    const node = this;
    // The HTML file seems to return the boolean items as string
    const {advanceMode = "false", strict = "false", additionalProperties = "false" } = config

    try{
      if(JSON.parse(`${advanceMode}`.toLowerCase())){
        const schema = JSON.parse(config.code)
        const result = validateOpenAISchema(schema)
        if(!result.isValid){
          node.status({fill:"red",shape:"dot",text:`${result.errorMsg}`});
          node.error(result.errorMsg)
        }else{
          node.status({fill:"blue",shape:"dot",text:"Ready (Advanced)"});
        }
      }else{
        node.status({fill:"blue",shape:"dot",text:"Ready (Simple)"});
      }
    }catch(e){
      node.status({fill:"red",shape:"dot",text:"Advance mode json invalid"});
      node.error(e)

    }

    const nodeDB = new ContextDatabase(RED);
    if (errorMessage) {
      // There was an error. Stop.
      node.status({fill:"red",shape:"dot",text:"Error"});
      return this.error(errorMessage);
    }
    else {
      // create a new entry in global context for the given node id
      nodeDB.saveIntent({
        nodeId: node.id,
        ...config,
        additionalProperties: JSON.parse(`${additionalProperties}`.toLowerCase()),
        advanceMode: JSON.parse(`${advanceMode}`.toLowerCase()),
        strict: JSON.parse(`${strict}`.toLowerCase()),
      });
    }

    // When Call Intent node publishes an event,
    // this node will only listen for its own intent
    const token = PubSub.subscribe(config.id, function (msg, data) {
      const nodeStore = nodeDB.getNodeStore();
      const { name, description, excludeFromOpenAi, code, strict, additionalProperties } = nodeStore[node.id];
      node.status({fill:"green",shape:"dot",text:`Received data ${new Date()}`});
      node.send([
        { ...data, _config: { name, description, excludeFromOpenAi, code, strict, additionalProperties } },
      ]);
    });

    // We need to clean up on close otherwise
    // more than one message is sent when a call is published
    this.on("close", function (removed, done) {
      if (removed) {
        nodeDB.removeIntent(config);
        PubSub.unsubscribe(token);
        end(done);
      } else {
        PubSub.unsubscribe(token);
        end(done);
      }
    });
  }

  RED.nodes.registerType("Register Intent", RegisterIntentHandlerNode);
};
