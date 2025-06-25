const { end } = require("../globalUtils");
const {chatGPTHelper} = require("./ChatGPTHelper");
const {ollamaHelper} = require("./OllamaHelper");
const {geminiHelper} = require("./GeminiHelper");
const {TYPES} = require("../constants");
const Sugar = require("sugar");
const vm = require("vm");

const PLATFORM =  [
  { value: "gpt", label: "ChatGPT"},
  { value: "gemini", label: "Gemini"},
  { value: "ollama", label: "Ollama"},
];

module.exports = function (RED) {

  function LLMChatNode (config) {
    RED.nodes.createNode(this, config);
    this.platform = RED.nodes.getNode(config.platform);
    const node = this;
    let userFunction;
    let systemFunction;
    try {
      // Wrap the user's code in a function
      systemFunction = new Function('msg', 'context', 'flow', 'global', config.system);
      userFunction = new Function('msg', 'context', 'flow', 'global', config.user);
    } catch (err) {
      node.error("Error parsing function: " + err.message);
    }

    this.on("input", function (msg, send, done = () => {}){


      try{
        node.status({fill:"green",shape:"ring",text:"Working..."});
        const context = node.context();
        const flow = context.flow;
        const global = context.global;
        const user = msg.payload?.user || userFunction(msg, context, flow, global);
        const system = msg.payload?.system || systemFunction(msg, context, flow, global);


        msg.payload = {user, system};

       if(!node?.platform?.platform){
         throw new Error("You need to select a platform in the LLM Chat Node")
       }


       switch(node.platform.platform){
         case "gpt":
           chatGPTHelper({node, RED, config, msg}, finish)
           break
         case "ollama":
          ollamaHelper({node, RED, config, msg}, finish)
           break
         case "gemini":
           geminiHelper({node, RED, config, msg}, finish)
           break
         default:
           node.status({fill:"red",shape:"ring",text:"Invalid configuration platform"});
           finish(`The configuration of this node is invalid platform ${node.platform.platform}`)
       }
      }catch(e){
        finish(e)
      }

      /**
       * Callback function to handle errors and completed flows
       * @param error
       * @param payload
       */
      function finish(error, payload){
        if(error){
          node.status({fill:"red",shape:"dot",text:"Error"});
          return end(done, error)
        }else if(send && payload){
          send(payload)
        }else if (payload){
          config.send.apply(node, arguments);
          end(done)
        }
        node.status({fill:"grey",shape:"dot",text:"Done"});

      }
    });
  }

  RED.nodes.registerType(TYPES.LLMChat, LLMChatNode, {
    settings: {
      lLMChatPlatforms: {
        value: PLATFORM,
        exportable: true,
      },
    },
  });
};
