# AI Intent Version 3

This is a collection of nodes to help enhance existing automations to be utilized by chatbots and take advantage of LLM's like GPT. There are 4 Nodes in this collection:

> Note: This uses GPT's Chat Completion API which is now considered Legacy. If it becomes deprecated. I will do my best to update this to leverage something equivalent.
### Breaking Changes

#### v1 - v2
There were changes under the hood how Intents are saved. This may cause some of your **Register Intent** and **Call Intent**
nodes to become invalid. Usually opening and closing the configuration of the nodes and redeploying should work. 
If this doesn't work, you may need to redo the nodes from the palette. 

#### v2 - v3
A lot of the nodes are being deprecated. The **User node**, **System Node**, **Response Node**, **Tool Node**, **Response Node**
**ChatGPT Node**, **Gemini Node**, **LocalAI Node**. Instead, use the **LLM Chat node**. This node replaces all of those nodes.
You can now write Function tools in the Register intent node which gives greater versatility.
> **PLEASE MIGRATE YOUR AUTOMATIONS TO USE THE LLM CHAT NODE.**
---

## LLM Chat Node

The **LLM Chat** node enables users to interact with a Large Language Model (LLM) and receive responses. It supports system and user messages, conversation tracking, and additional configuration options.
> Watch tutorial: https://youtu.be/2Efb1X6F5UY
---

## **Important**
To use this node, you need to configure the connection details. Consult the documentation for your chosen LLM platform (e.g., OpenAI, Ollama, Gemini) for specific instructions.

---

## **Inputs**

### **1. Main Input (`msg.payload`)**
The primary input for the LLM. It must include a `user` message and may optionally contain a `system` message.

#### **Example:**
```javascript
msg.payload = {
    system: "You are a helpful assistant.",
    user: "What is the capital of Alaska?"
};
```
- **`system`** (optional): Provides instructions to guide the model’s behavior.
- **`user`** (required): Contains the user's query or command.

---

### **2. Additional Options (`msg.payload.options`)**
Allows users to send extra parameters to customize LLM responses.

#### **Example:**
```javascript
msg.payload = {
    user: "What is the capital of Alaska? Respond using JSON.",
    options: {
        format: "json" // Example for Ollama
    }
};
```

The available options depend on the LLM platform and may include parameters such as:
- **`temperature`**: Controls randomness.
- **`max_tokens`**: Limits response length.
- **`format`**: Defines response structure (e.g., JSON).

Refer to the LLM's documentation for more details.

---

### **3. Clear Chat History (`msg.clearChatHistory`)**
- **Type**: `boolean` (optional)
- **Behavior**: If set to `true`, the conversation history will be cleared for the specified **Conversation Id**.

#### **Example:**
```javascript
msg.clearChatHistory = true;
```

---

## **Node Configuration**

### **1. Conversation Id**
- **Type**: `string`
- **Description**: This value is used as a key to store and track conversation history. If multiple nodes share the same Conversation Id, they will share the same conversation context.
- **If omitted**: Each call to the LLM will be independent, without historical context.

---

### **2. Tool Choice**
Defines whether the LLM should use function calling.

#### **Options:**
- **`None`**: Disables tools; the LLM won’t use functions.
- **`Automatic`**: Allows the LLM to decide when to use selected tools.
- **`Required`**: Forces the LLM to use at least one selected tool.

> **Note:** For Ollama, not all models support function calling.

---

### **3. Tools**
- **Type**: `string`
- **Description**: This field is populated by **Register Intent** nodes. It allows selecting one or more functions that the LLM can use.
- **Behavior**: The LLM will consider calling the selected functions based on the **Tool Choice** setting.

---

## **System and User Messages**
Messages must be passed in the `msg.payload` object:
```javascript
msg.payload = {
    system: "You are a helpful assistant.",
    user: "What is the capital of Alaska?"
};
```

The **system message** is optional but helps set the LLM’s behavior. The **user message** is required for every interaction.

To include additional response options:
```javascript
msg.payload = {
    user: "What is the capital of Alaska? Respond using JSON.",
    options: {
        format: "json" // Example for Ollama
    }
};
```

---

## **Summary**
- Use `msg.payload` with `user` (required) and `system` (optional) messages.
- Customize responses with `msg.payload.options`.
- Set `msg.clearChatHistory = true` to reset conversation history.
- Configure **Conversation Id** to maintain or separate conversation history.
- Choose **Tool Choice** and **Tools** to enable function calling when supported.

For more details, refer to the documentation of your selected LLM platform.



---
## Register Intent Node

### Purpose
The **Register Intent Node** allows users to define custom actions (intents) that can be triggered by the **Call Intent Node** or AI assistants like OpenAI.
> Watch Tutorial: https://youtu.be/FvP04OToeLQ

### Configuration
- **Name (string):** A unique identifier for the intent (alphanumeric, underscores, hyphens, max 64 characters).
- **Description (string):** A clear explanation of the intent’s purpose. If using AI assistants, this helps them understand when to trigger the intent.
- **Advanced Mode (boolean):** Enables structured AI interactions using a JSON-based schema.
- **Tool Schema (JSON, required if Advanced Mode is enabled):** Defines the expected parameters for AI-generated inputs.

### Usage
Place this node at the beginning of a flow to register an intent. Other flows or AI models can then call this intent dynamically. For AI integrations, ensure the description field is precise to improve intent recognition.

### Example JSON Schema for OpenAI
```json
{
    "type": "object",
    "properties": {
        "eventName": {
            "type": "string",
            "description": "Unique event identifier."
        },
        "eventTime": {
            "type": "string",
            "format": "date-time",
            "description": "ISO8601 formatted event time."
        },
        "eventPayload": {
            "type": "string",
            "description": "Command for smart home actions."
        }
    },
    "required": ["eventName", "eventTime"],
    "additionalProperties": false
}
```

### AI Platform Considerations
Different AI platforms may have unique function calling mechanisms. Refer to the official documentation for specifics:
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [Google Gemini API](https://ai.google.dev/gemini-api/docs/function-calling)
- [Ollama Tool Support](https://ollama.com/blog/tool-support)

---
## Call Intent Node

### Purpose
The **Call Intent Node** is used to trigger an intent that has been previously registered using the **Register Intent Node**.

### Configuration
- **Name (string):** A label for the node.
- **Registered Node Name (string):** Select from a dropdown list of available registered intents or pass the intent dynamically via `msg.payload.nodeName`.

### Usage
This node acts as a trigger for registered intents. It can:
- Directly call an intent similar to a link node.
- Be placed after an **LLM Chat Node**, allowing AI to determine which intent to execute dynamically.
- Trigger multiple intents if the payload contains an array of intent names.

#### Example Payload for Multiple Calls
```json
{
    "payload": [
        {"nodeName": "turn_on_lights"},
        {"nodeName": "set_thermostat"}
    ]
}
```

---
## LLM Chat Node

### Purpose
The **LLM Chat Node** integrates with various AI models to process and respond to natural language input dynamically.

### Usage
Place this node in a flow where dynamic AI-driven responses are required. It can:
- Answer user queries.
- Process input and pass structured responses to downstream nodes.
- Work in conjunction with **Register Intent** and **Call Intent Nodes** to enable complex AI-driven automations.

### Example Use Case
A user asks: *"What’s the weather today?"*
1. **LLM Chat Node** processes the request.
2. If the AI determines a weather function is needed, it triggers a **Call Intent Node**.
3. The **Call Intent Node** invokes a flow that retrieves weather data and returns a response.

---
