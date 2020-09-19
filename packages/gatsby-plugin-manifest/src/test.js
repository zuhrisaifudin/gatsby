const { nodeStateMachine } = require(`./state-machines`)
const { interpret } = require(`xstate`)
// const { validateAll, extractManifest } = require(`./plugin-options`)

const service = interpret(nodeStateMachine).start()

service.onTransition(state => {
  if (state.changed) {
    console.log(`value`, state?.value)
    console.log(`context`, JSON.stringify(state.context, null, 2))
  }
})

service.send(`INITIALIZE`, {
  pluginOptions: { name: `test`, icon: `/path/to/icon.png` },
})

// validateAll({
//   name: `test`,
//   icon: `/path/to/icon.png`,
// }).then(res => console.log(JSON.stringify(res, null, 2)))
