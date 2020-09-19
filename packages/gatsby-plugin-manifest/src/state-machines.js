import { Machine, assign } from "xstate"

import { validateAll, extractConfig, extractManifest } from "./plugin-options"
// Available variables:
// - Machine
// - interpret
// - assign
// - send
// - sendParent
// - spawn
// - raise
// - actions

const handleError = {
  target: `#error`,
  actions: assign({
    error: (ctx, ev) => ev.data.error,
  }),
}

export const nodeStateMachine = Machine({
  id: `manifest-node`,
  initial: `idle`,
  context: {
    cacheDigest: ``,
    pluginConfig: {},
    manifest: {},
    imageGeneration: {},
    error: {},
  },
  states: {
    idle: {
      on: {
        INITIALIZE: `init`,
      },
    },
    init: {
      id: `init`,
      initial: `validateOptions`,
      target: `initComplete`,
      states: {
        validateOptions: {
          invoke: {
            id: `validateOptions`,
            src: (ctx, ev) => validateAll(ev.pluginOptions),
            onDone: {
              target: `splitOptions`,
              actions: assign({
                pluginOptions: (ctx, ev) => ev.data,
              }),
            },
            onError: handleError,
          },
        },
        splitOptions: {
          invoke: {
            id: `splitOptions`,
            src: async ({ pluginOptions }, ev) =>
              Promise.all([
                extractConfig(pluginOptions),
                extractManifest(pluginOptions),
              ]),
            onDone: {
              target: `#initComplete`,
              actions: assign((ctx, ev) => {
                const [pluginConfig, manifest] = ev.data

                return { pluginConfig, manifest }
              }),
            },
          },
        },
      },
    },
    initComplete: {
      id: `initComplete`,
      on: {
        START_NODE: `gatsbyNode`,
        // BROWSER_WORK: `gatsbyBrowser`,
        // SSR_WORK: `gatsbySSR`,
      },
    },
    gatsbyNode: {
      type: `parallel`,
      states: {
        onPostBootstrap: {
          initial: `processOne`,
          states: {
            processOne: {
              after: {
                3000: `processTwo`,
              },
            },
            processTwo: {
              after: {
                2000: `done`,
              },
            },
            done: {
              type: `final`,
            },
          },
        },
        onCreateWebpackConfig: {
          initial: `processOne`,
          states: {
            processOne: {
              after: {
                1000: `processTwo`,
              },
            },
            processTwo: {
              after: {
                2000: `done`,
              },
            },
            done: {
              type: `final`,
            },
          },
        },
      },
      exit: (ctx, ev) =>
        assign({
          ...ctx,
        }),
    },
    error: {
      id: `error`,
      entry: (ctx, ev) => console.error(ctx.error),
    },
  },
})
