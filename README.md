## AI Intent

This is a collection of nodes to help enhance existing automations to be utilized by chatbots and take advantage of LLM's like GPT. There are 4 Nodes in this collection:

### Register Intent

This node creates a subscription that can be activated by the **Call Intent** node. At minimum this node can be used as a way to link automations in different flows very similar to the native `Link In`/`Link Out` nodes but it is unrestricted in where it can be used. Additionally, these nodes are automatically added to the **OpenAI Chat** node's payload as functions OpenAI can call. If this negatively affects your results, you can exclude them from the payload using the `excludeFromOpenAI` checkbox.

> You cannot have to Register Intent nodes with the same name. This will lead to unintended results

### Call Intent

Triggers the associated **Register Intent** node. When this node is attached directly after the **OpenAI Response** node, it can dynamically trigger Registered intents. To see this in action check the examples folder and look for the `openai-call-registered-intent-example.json`.

### OpenAI Chat

Calls OpenAI by constructing a payload using the information from **OpenAI User**, **OpenAI System**, and **OpenAI Tools**.
The three aforementioned nodes must be used first during the flow as they provide necessary information for **OpenAI Chat**
to use.

### OpenAI User

Provides the message with role = user to use in OpenAI's chat completition Payload. This node is also capable of utilizing string substitution and can replace tokenized content in the string payload with data from the msg object. Any text wrapped in single curly brace `{}` will be treated as a key in the msg object.

### OpenAI System

Provides the message with role = system to use in OpenAI's chat completition Payload. This node is also capable of utilizing string substitution and can replace tokenized content in the string payload with data from the msg object. Any text wrapped in single curly brace `{}` will be treated as a key in the msg object.

### OpenAI Tool

Provide functions the Open AI can use to handle unique requests. These nodes can be chain with other **OpenAI Tool** nodes and the system will automatically append subsequent functions to the same payload.

### OpenAI Response

Sanitizes the response from OpenAI. This provides a consistent easy to read output but it will also pass the original OpenAI output in a separate property called `originalResponse`.

### How to use

> NOTE: You need to have a valid token from OpenAI for this to work. Visit [OpenAI](https://platform.openai.com/).

Once you have a valid token there are two ways to install it.

#### Configuration Node

![](https://raw.githubusercontent.com/montaque22/node-red-contrib-ai-intent/master/images/set-config-node.gif)
When you use the **OpenAI Chat** node there is a Token dropdown. Click the pencil icon and paste the token key into the text box and click add. This method is the easiest however it you should be careful when exporting your flows as the token will be added to the exported JSON.

#### Settings.js File

Alternatively, you can add your token to the settings.js file. The file can be found under `.node-red/settings.js` path (or some equivalent). Based on reports from various users the location seems to be slightly different based on how you installed it. You may want to do a global search for it if you're having trouble. Once you find the file search for the `functionGlobalContext` property and add the following:

```
  functionGlobalContext: {
    openaiAPIKey: "YOUR-TOKEN-API-GOES-HERE",
  },

```

Make sure you restart node-red once you save this file. This method is more complicated than the Configuration node however you can freely share and export your flows and automations as the token will be hidden from the flow.

Watch this video to learn how to use this plugin

[![AI-Intent Tutorial](https://i9.ytimg.com/vi_webp/118J9Z47zQU/mqdefault.webp?v=65876ef6&sqp=CIjBr6wG&rs=AOn4CLAktZN_I2sbqAXl86e8N-rYMoOVyA)](https://youtu.be/J0_mi7U0wCM)
