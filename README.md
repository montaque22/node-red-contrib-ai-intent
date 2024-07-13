# AI Intent

This is a collection of nodes to help enhance existing automations to be utilized by chatbots and take advantage of LLM's like GPT. There are 4 Nodes in this collection:

> Note: This uses GPT's Chat Completion API which is now considered Legacy. If it becomes deprecated. I will do my best to update this to leverage something equivalent.
### Breaking Changes
There were changes under the hood how Intents are saved. This may cause some of your **Register Intent** and **Call Intent**
nodes to become invalid. Usually opening and closing the configuration of the nodes and redeploying should work. 
If this doesn't work, you may need to redo the nodes from the palette. 

## Register Intent

This node creates a subscription that can be activated by the **Call Intent** node. At minimum this node can be used as a way to link automations in different flows very similar to the native `Link In`/`Link Out` nodes but it is unrestricted in where it can be used. Additionally, these nodes are automatically added to the **OpenAI Chat** node's payload as functions OpenAI can call. If this negatively affects your results, you can exclude them from the payload using the `excludeFromOpenAI` checkbox.

> You cannot have to Register Intent nodes with the same name. This will lead to unintended results

## Call Intent

Triggers the associated **Register Intent** node. When this node is attached directly after the **OpenAI Response** node, it can dynamically trigger Registered intents. To see this in action check the examples folder and look for the `openai-call-registered-intent-example.json`.

**To learn more about both the Call and Register Intent, watch the video below.**
[![Call/Register Intent](https://raw.githubusercontent.com/montaque22/node-red-contrib-ai-intent/master/images/call_register_intent.jpeg)](https://youtu.be/oWP8es4g4D0)

## OpenAI / Local LLM / Gemini

These represent the various services you can use within your automations. 
By constructing a payload using the information from **User**, **System**, and **Tools***, these services can return the
processed data using their respective infrastructure. OpenAI is the most stable and provides a reliable experience. 
Gemini works very similar to OpenAI however I have seen some strange quirks when using **Tools** node based on how you
define the schema. LocalAI is the least stable of the 3. I do not have a system with adequate GPU, so it is slow for me.
However, your Local LLM may provide superior results than mine so use at your own discretion. 
> Remember you need to use at minimum the **User** node before using any of the three Service nodes.

## User

Provides the message with role = user to use in OpenAI's chat completion Payload. This node is also capable of utilizing string substitution and can replace tokenized content in the string payload with data from the msg object. Any text wrapped in single curly brace `{}` will be treated as a key in the msg object.

## System

Provides the message with role = system to use in OpenAI's chat completion Payload. This node is also capable of utilizing string substitution and can replace tokenized content in the string payload with data from the msg object. Any text wrapped in single curly brace `{}` will be treated as a key in the msg object.

## Tool

Provide functions the Open AI can use to handle unique requests. These nodes can be chained with other **OpenAI Tool** nodes and the system will automatically append subsequent functions to the same payload.

## Response

Sanitizes the response from OpenAI. This provides a consistent easy to read output, but it will also pass the original OpenAI output in a separate property called `originalResponse`.

## How to use

> NOTE: You need to have a valid token from OpenAI for this to work. Visit [OpenAI](https://platform.openai.com/).

Once you have a valid token there are two ways to install it.

### Configuration Node

![](https://raw.githubusercontent.com/montaque22/node-red-contrib-ai-intent/master/images/set-config-node.gif)
When you use the **OpenAI** node or **Gemini** node, they require an API token. You can add one via the UI Configuration
by clicking the pencil icon and paste the token key into the text box and click add. 
This method is the easiest, but you should be careful when exporting your flows as the token will be added to the 
exported JSON. If you share your code often or would like to not have to worry about this, you can add the token to the
`settings.js` file

### Settings.js File

You can add your token to the settings.js file. The file can be found under `.node-red/settings.js` path (or some equivalent). 
Based on reports from various users the location seems to be slightly different based on how you installed it. 
You may want to do a global search for it if you're having trouble. 
Once you find the file search for the `functionGlobalContext` property and add the following:

```
  functionGlobalContext: {
    openaiAPIKey: "YOUR-TOKEN-API-GOES-HERE",
    geminiaiAPIKey: "Your Key Goes Here",
  },

```

Make sure you restart node-red once you save this file. This method is more complicated than the Configuration node however you can freely share and export your flows and automations as the token will be hidden from the flow.

> Home Assistant Users: if you installed node-red as an addon, your settings.js file may be in a different location. Try looking for a folder called **addon_configs** and look for a folder ending with **\_nodered**. You may need the Samba Addon in order to see all the folders.

## Watch this video to learn how to use this plugin

[![AI-Intent Tutorial](https://raw.githubusercontent.com/montaque22/node-red-contrib-ai-intent/master/images/finally.jpg)](https://youtu.be/J0_mi7U0wCM)

Alternatively, you can check out [Chaperone](https://montaque22.github.io/#/aiIntent) to get a quick overview of each node with example automations
