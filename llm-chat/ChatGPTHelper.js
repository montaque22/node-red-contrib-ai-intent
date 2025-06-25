const { GlobalContext } = require("../utilities/global-context");
const { TOOL_CHOICE} = require("../constants");
const OpenAI = require("openai");
const {ContextDatabase} = require("../globalUtils");
const {ConversationHistory} = require("../utilities/conversationHistory");
const {Format} = require("../utilities/format");

const chatGPTHelper = (props,callback) => {
    const {node, config, msg, RED} = props
    const nodeDB = new GlobalContext(node);
    const {model, credentials} = node.platform
    const apiKey = credentials.api

    if (!apiKey) {
        node.status({fill:"red",shape:"dot",text:"Error"});
        return callback("Api key missing for OpenAI. Please add openaiAPIKey key-value pair to the functionGlobalContext.");
    }

    const openai = new OpenAI({ apiKey });
    const {options = {}, system = "", user = ""} = msg?.payload || {}
    const conversation_id = msg.conversationId || config.conversation_id;
    const conversationHistory = new ConversationHistory(nodeDB, conversation_id, msg.clearChatHistory)

    if(msg.clearChatHistory){
        node.warn("Conversation history cleared")
    }

    if(!user){
        node.status({fill:"red",shape:"dot",text:"Stopped"});
       return node.warn("payload.user is empty. Stopping the flow ")
    }

    conversationHistory.addSystemMessage(system)
    conversationHistory.addUserMessage(user)


    const toolProperties = getToolProperties(config, msg.tools, RED)
    const finalProps = {
        ...options,
        ...toolProperties,
        model,
        messages: conversationHistory.conversation
    };

    openai.chat.completions
        .create(finalProps)
        .then((response) => {

            response.choices.forEach(choice => {
                conversationHistory.addAssistantMessage(choice.message.content)
            })

            conversationHistory.saveHistory(config.historyLimit)

            return createPayload({...finalProps, conversationId: conversation_id}, response, msg, conversationHistory.conversation)
        })
        .then(msg => {
            callback(null, msg)
        })
        .catch((err) => {
            callback(err)
        });
}

const createPayload = (request, response, previousMsg, conversationHistory) => {
    const format = new Format()
    const payload = format.formatPayloadForOpenAI(response.choices)

    return {
        ...previousMsg,
        payload,
        apiResponse: response,
       _debug: {
         ...request,
           messages: conversationHistory
       },
   }
}

const getAllTools = (RED) => {
    const context = new ContextDatabase(RED);
    const intents = context.getNodeStore() || {};
    return createFunctionsFromContext(intents)
}

/**
 * Converts the raw intents into functions that the LLM can use.
 * @param {*} node
 * @returns
 */
getRegisteredIntentFunctions = (RED) => {
    const intents = getRawIntents(RED);
    return createFunctionsFromContext(intents);
};

/**
 * This will return all stored Registered Intents throughout the entire system
 * and Tool Nodes that are attached directly to this flow
 * This will return:
 *  type RawIntent = {
 *    [node_id]: node // could be Registered Intent or Tool node
 *  }
 */
getRawIntents = (RED) => {
    const context = new ContextDatabase(RED);
    return context.getNodeStore() || {};
};

/**
 * converts the registered intents stored in the context into functions that can be used by the LLM.
 * The registered intent will be ignored if excludeFromOpenAi is set to true.
 * rawIntents may have tool nodes included so the values need to be filtered by the node type.
 * rawIntents have the following shape:
 *
 * type RawIntents = {
 *  [node_id]: node // node could be Registered Intent or Tool node
 * }
 */
const createFunctionsFromContext = (rawIntents = {}) => {
    return (
        Object.values(rawIntents)
            .filter((payload) => {
                return payload.type === "Register Intent";
            })
            .map((payload) => {
                if (payload.excludeFromOpenAi) {
                    return undefined;
                }

                const {code = "", strict = true, additionalProperties = false} = payload;
                const parameters = code.trim() ?
                    JSON.parse(code) : {type: "object", properties: {}, required: []};


                //TODO -  Remove after all the old versions are deprecated
                const {properties = {}, required = []} = parameters
                required.push("isRegisteredIntent")
                properties.isRegisteredIntent = { type:"boolean", const: true }

                return {
                    type: "function",
                    function: {
                        name: payload.name,
                        description: payload.description,
                        parameters: {
                            ...parameters,
                            properties,
                            required,
                            additionalProperties
                        },
                        strict: JSON.parse(strict)
                    },
                };
            })
            .filter(Boolean) || []
    );
};


/**
 *
 * @param config
 * @param deprecatedTools
 * @returns {{}}
 */
const getToolProperties = (
    config,
    deprecatedTools = [],
    RED
) => {

    const tool_choice = config.tool_choice
    const tool_string_ids = config.tools;
    const tool_ids = tool_string_ids.split(",");
    const toolProperties = {}
    const allTools = getAllTools(RED)
    const tools = []

    if(tool_choice !== TOOL_CHOICE.None){
        [...deprecatedTools, ...allTools].forEach(tool => {
            if(tool_ids.includes(tool.function.name)){
                tools.push(tool);
            }
        })

        toolProperties.tools = tools
        toolProperties.tool_choice = tool_choice
    }

    return toolProperties
}

module.exports = {
    chatGPTHelper
}
