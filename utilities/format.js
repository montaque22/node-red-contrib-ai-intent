const Sugar = require("sugar");

class Format {

    // formatResponse(choices){
    //     msg.originalResponse = msg.payload;
    //
    //     switch (msg._debug.type) {
    //         case TYPES.OpenAIChat: {
    //             return this.formatPayloadForOpenAI(choices);
    //             break;
    //         }
    //         case TYPES.GeminiaiChat: {
    //             msg.payload = this.formatPayloadForGeminiAI(msg);
    //             break;
    //         }
    //         case TYPES.LocalAIChat: {
    //             msg.payload = this.formatPayloadForLocalAI(msg);
    //             break;
    //         }
    //         default:
    //             node.warn(
    //                 `Not sure where ${msg._debug.type} came from but it isn't supported`
    //             );
    //     }
    // }


   createConsistentPayload(content){
        return {
            args: {
                response: content
            },
        };
    };

    formatPayloadForLocalAI  (msg){
        const { tool_calls = [], content } = msg;
        const output = [];
        const payload = this.createConsistentPayload(content);

       if(tool_calls.length){
           tool_calls.forEach((answer) => {

               const payload = this.createConsistentPayload(answer.content);

               if (answer.function) {
                   const deepCopyPayload = Sugar.Object.clone(payload, true);

                   deepCopyPayload.args = {
                       ...answer.function.arguments,
                   };
                   deepCopyPayload.nodeName = answer.function.name;
                   output.push(deepCopyPayload);

               } else {
                   output.push(payload);
               }
           });
       }else{
           output.push(payload);
       }

        return output
    };

    formatPayloadForOpenAI (choices) {
        const output = [];
        // Goes through the OpenAI Response and creates a standard uniformed output
        choices.forEach((answer) => {
            const { content = "", tool_calls } = answer.message;
            const payload = this.createConsistentPayload(content);

            if (tool_calls) {
                tool_calls.forEach((tool) => {
                    const deepCopyPayload = Sugar.Object.clone(payload, true);

                    if (tool.type === "function") {
                        deepCopyPayload.args = {
                            ...JSON.parse(tool.function.arguments),
                        };
                        deepCopyPayload.nodeName = tool.function.name;
                        output.push(deepCopyPayload);
                    }
                });
            } else {
                output.push(payload);
            }
        });

        return output;
    };

    formatPayloadForGeminiAI (msg) {
        const output = [];
        // Goes through the OpenAI Response and creates a standard uniformed output
        const { functions = [], message } = msg.payload;

        if (functions.length > 0) {
            functions.forEach((tool) => {
                const { name, args } = tool;
                const payload = createConsistentPayload(message.content);

                output.push({
                    args: {
                        ...payload.args,
                        ...args,
                    },
                    nodeName: name,
                });
            });
        } else {
            output.push(createConsistentPayload(message.content));
        }

        return output;
    };
}

module.exports = {
    Format,
};
