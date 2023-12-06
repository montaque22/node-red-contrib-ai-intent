# AI Intent

> This is experimental and subjected to change!

This is a collection of nodes to help enhance existing automations to be utilized by chatbots and take advantage of LLM's like GPT. There are 4 Nodes in this collection:

## Register Intent

This node creates a subscription that can be activated by the **Call Intent** node. At minimum this node can be used as a way to link automations in different flows very similar to the native `Link In`/`Link Out` nodes but it is unrestricted in where it can be used. Additionally, these nodes are automatically added to the **OpenAI Chat** node's payload as functions OpenAI can call. If this negatively affects your results, you can exclude them from the payload using the `excludeFromOpenAI` checkbox.

## Call Intent

Triggers the associated **Register Intent** node. When this node is attached directly after the **OpenAI Response** node, it can dynamically trigger Registered intents.

## OpenAI Chat

Calls OpenAI by constructing a payload using the information from **OpenAI User**, **OpenAI System**, and **OpenAI Tools**.
The three aforementioned nodes must be used first during the flow as they provide necessary information for **OpenAI Chat**
to use.

## OpenAI User

Provides the message with role = user to use in OpenAI's chat completition Payload. This node is also capable of utilizing string substitution and can replace tokenized content in the string payload with data from the msg object. Any text wrapped in single curly brace `{}` will be treated as a key in the msg object.

## OpenAI System

Provides the message with role = system to use in OpenAI's chat completition Payload. This node is also capable of utilizing string substitution and can replace tokenized content in the string payload with data from the msg object. Any text wrapped in single curly brace `{}` will be treated as a key in the msg object.

## OpenAI Tool

Provide functions the Open AI can use to handle unique requests. These nodes can be chain with other **OpenAI Tool** nodes and the system will automatically append subsequent functions to the same payload.

## OpenAI Response

Sanitizes the response from OpenAI. This provides a consistent easy to read output but it will also pass the original OpenAI output in a separate property called `originalResponse`.
