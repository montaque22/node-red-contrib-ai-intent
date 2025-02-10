const Sugar = require("sugar");

class Format {
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
        const { functions = [], text } = msg;
        const payload = this.createConsistentPayload(text);

        if (functions.length > 0) {
            functions.forEach((tool) => {
                const { name, args } = tool;
                output.push({
                    args: {
                        ...payload.args,
                        ...args,
                    },
                    nodeName: name,
                });
            });
        } else {
            output.push(payload);
        }

        return output;
    };
}

module.exports = {
    Format,
};
