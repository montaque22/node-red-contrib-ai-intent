const { GlobalContext } = require("../utilities/global-context");
const { TOOL_CHOICE, ROLES} = require("../constants");
const {ContextDatabase, end} = require("../globalUtils");
const {ConversationHistory} = require("../utilities/conversationHistory");
const {Format} = require("../utilities/format");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Sugar = require("sugar");

const geminiHelper = (props,callback) => {
    const {node, config, msg, RED} = props
    const nodeDB = new GlobalContext(node);
    const {model, credentials} = node.platform
    const apiKey = credentials.api

    if (!apiKey) {
        node.status({fill:"red",shape:"dot",text:"Error"});
        return callback("Api key missing for Gemini. Please update the configuration");
    }

    const {options , system = "", user = ""} = msg?.payload || {}
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

    // Access your API key as an environment variable (see "Set up your API key" above)
    const genAI = new GoogleGenerativeAI(apiKey);
    const toolProperties = getToolProperties(config, msg.tools, RED)
    const modelParams = {
        ...toolProperties,
        model
    };

    if(options && typeof options === "object"){
        modelParams.generationConfig = options
    }

    // The Gemini 1.5 models are versatile and work with most use cases
    const genModel = genAI.getGenerativeModel(modelParams);
    const {history,message, updated} = convertChatToGeminiCompatibleChat(conversationHistory.conversation)
    const chat = genModel.startChat({
        history,
    });
    const finalProps = {
        ...modelParams,
        messages: updated
    };

    chat
        .sendMessage(message)
        .then((result) => result.response)
        .then((response) => {
            return {
                functions: response.functionCalls() || [],
                text: response.text(),
            };
        })
        .then((payload) => {
            conversationHistory.addAssistantMessage(payload.text, "Model")
            conversationHistory.saveHistory(config.historyLimit)

            return createPayload({...finalProps, conversationId: conversation_id}, payload, msg, conversationHistory.conversation)
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
    const payload = format.formatPayloadForGeminiAI(response)

    return {
        ...previousMsg,
        payload,
        apiResponse: response,
       _debug: {
            ...request,
           messages: conversationHistory
       }
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
                const parameters = payload.code?.trim() ?
                    JSON.parse(payload.code) : {type: "object", properties: {}, required: []};


                //TODO -  Remove after all the old versions are deprecated
                const {properties = {}, required = []} = parameters
                required.push("isRegisteredIntent")
                properties.isRegisteredIntent = {  type: "string", enum: ["true"]  }

                return {
                    type: "function",
                    function: {
                        name: payload.name,
                        description: payload.description,
                        parameters: {
                            ...parameters,
                            properties,
                            required,
                        }
                    }
                };
            })
            .filter(Boolean) || []
    );
};


const convertChatToGeminiCompatibleChat = (messages = []) => {
    const original = Sugar.Object.clone(messages, true);
    console.log(original)
    const updated = messages.map((message, index) => {
        let role = message.role;
        // Gemini doesn't seem to have a system role. We wil convert it to a user
        if (role === "system" && index === 0) {
            role = "user";
        }

        return { role, parts: [{ text: message.content }] };
    });

    const history = Sugar.Object.clone(updated, true);
    const nextMessage = history.pop()
    const message = nextMessage?.parts[0]?.text || "";

    return {
        original, // contains  the full chat in it's original form
        updated, // full list of gemini compatible chat
        message, // the next gemini compatible chat item
        history // contains the gemini compatible chat w/o the user's current message (the last message in the array)
    };
};

const convertToolsToGeminiCompatibleTools = (tools = []) => {
    return {
        functionDeclarations: tools.map((tool) => {
            return tool.function;
        }),
    };
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
    const mode = convertToolChoiceToGeminiCompatibleChoice(config.tool_choice)
    const tool_string_ids = config.tools;
    const allowed_function_names = tool_string_ids.split(",");
    const toolProperties = {}
    const allTools = getAllTools(RED)
    const tools = []
    const tool_config = {
        function_calling_config:{
            mode,
            allowed_function_names
        }
    }

    if(mode.toLowerCase() !== TOOL_CHOICE.None) {
        [...deprecatedTools, ...allTools].forEach(tool => {
            if(allowed_function_names.includes(tool.function.name)){
                tools.push(tool);
            }
        })

        toolProperties.tools = convertToolsToGeminiCompatibleTools(tools)
        toolProperties.tool_config = tool_config
    }

    return toolProperties
}

function convertToolChoiceToGeminiCompatibleChoice(mode){
    switch(mode){
        case TOOL_CHOICE.Required:
            return TOOL_CHOICE.Any.toUpperCase()
        default:
            return mode.toUpperCase()
    }
}


module.exports = {
    geminiHelper
}
