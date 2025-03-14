const {CONVERSATION_CONTEXT, ROLES} = require("../constants");

class ConversationHistory {
    constructor(nodeDB, conversationId) {
        this.conversationId = conversationId;
        this.nodeDB = nodeDB;
        this.conversation = []

        if(!nodeDB){
            throw new Error("nodeDB does not exist");
        }else if(conversationId){
            const allConversations = nodeDB.getValueFromGlobalContext(CONVERSATION_CONTEXT) || {}
            this.conversation = allConversations[conversationId] || []
        }
    }

    addSystemMessage(content){
        if(!content){
            return false
        }

        const entry = {role: ROLES.System, content }

        if(this.conversation[0]?.role === ROLES.System){
            this.conversation[0] = entry
        }else{
            this.conversation = [entry, ...this.conversation]
        }

        this.saveHistory()
    }

    addUserMessage(content){
        if(!content){
            return false
        }

        const entry = {role: ROLES.User, content }
        this.conversation.push(entry)
        this.saveHistory()
    }
    addAssistantMessage(content){
        if(!content){
            return false
        }

        const entry = {role: ROLES.Assistant, content }
        this.conversation.push(entry)
        this.saveHistory()
    }
    addToolMessage(content){
        if(!content){
            return false
        }

        const entry = {role: ROLES.Tool, content }
        this.conversation.push(entry)
        this.saveHistory()
    }

    clearHistory(){
        this.conversation = []
        this.saveHistory()
    }

     saveHistory(){
        if(this.conversationId){
            const allConversations = this.nodeDB.getValueFromGlobalContext(CONVERSATION_CONTEXT) || {}
            allConversations[this.conversationId] = this.conversation
            this.nodeDB.setValueToGlobalContext(allConversations, CONVERSATION_CONTEXT)
        }
     }
}

module.exports = {
    ConversationHistory,
};
