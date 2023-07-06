const Sugar = require("sugar");
const { DidRunOnce } = require("../didRunOnceStore");
const { ACTIVE_CONVERSATION, INTENT_STORE } = require("../constants");

module.exports = function (RED) {
  function ContextHandlerNode(config) {
    RED.nodes.createNode(this, config);

    const node = this;
    let timeoutId;

    function initTimeout(msg, key, ms) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        const globalContext = node.context().global;

        globalContext.set(key, undefined);
        return node.send([null, msg]);
      }, ms);
    }

    node.on("input", function (msg, send, done = () => {}) {
      const { wait, contextId, path, action } = config;
      const key = contextId || msg.payload?.contextId;
      const globalContext = node.context().global;
      const didRunOnce = new DidRunOnce(globalContext);
      send =
        send ||
        function () {
          node.send.apply(node, arguments);
        };

      if (!path && ["find", "save"].includes(action)) {
        return node.error("Missing path");
      } else if (
        !key &&
        ![
          "clear intent",
          "get conversation intent",
          "get registered intents",
        ].includes(action)
      ) {
        return node.error("Missing id");
      }

      let value = Sugar.Object.get(msg, path);

      if (action === "find") {
        value = globalContext.get(key);
        config.path = "";
      } else if (action === "save") {
        globalContext.set(key, value);
      } else if (action === "clear context") {
        config.path = "";
        return initTimeout(msg, key, 0);
      } else if (action === "clear intent") {
        config.path = "";
        didRunOnce.reset();
        return initTimeout(msg, ACTIVE_CONVERSATION, wait * 1000 * 60);
      } else if (action === "get conversation intent") {
        msg.payload = globalContext.get(ACTIVE_CONVERSATION) || "";
        send([msg]);
        return done();
      } else if (action === "get registered intents") {
        msg.payload = globalContext.get(INTENT_STORE) || {};
        send([msg]);
        return done();
      }

      msg.payload = value;

      if (wait === undefined) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      } else {
        initTimeout(msg, key, wait * 1000 * 60);
      }

      send([msg]);
      done();
    });
  }
  RED.nodes.registerType("Context Handler", ContextHandlerNode, {
    settings: {
      contextHandlerGlobals: {
        value: { foo: "bar", hello: "world" },
        exportable: true,
      },
    },
  });
};
