#AI Intent

> This is experimental and subjected to change!

This is a collection of nodes to help enhance existing automations to be utilized by chatbots and take advantage of LLM's like GPT. There are 4 Nodes in this collection:

## Register Intent

This node will make it easier for chatbots and GPT to run custom automations by saving meta data to the global context for later access.

## Call Intent

Calls automations tagged by the `Register Intent` node.

## Context Handler

Provides an opinionated way to find save and clear data from the global context

## Gather Context

Uses NLP to interpret data from text users provide. If the text does not match the context indicated by the node, the flow will "loop" until provided.

The above nodes are extremely experimental and subjected to change so use at your own risk
