const dagsby = require(`dagsby`)
const execa = require(`execa`)
const uuid = require(`uuid`)
const fs = require(`fs-extra`)
const path = require(`path`)
const detectPort = require(`detect-port`)
const os = require(`os`)
const { cpuCoreCount } = require(`gatsby-core-utils`)

let task
let runner
;(async () => {
  // Create our runner.
  const httpPort = await detectPort(6898)
  const socketPort = await detectPort(7899)
  const numWorkers = cpuCoreCount()
  // Create a temporary directory
  const directory = path.join(os.tmpdir(), `dagsby`)
  fs.ensureDirSync(directory)
  const workerPool = execa.node(
    path.join(process.cwd(), `node_modules/dagsby/dist/worker-pool-server.js`),
    [
      `--numWorkers`,
      numWorkers,
      `--directory`,
      directory,
      `--socketPort`,
      socketPort,
      `--httpPort`,
      httpPort,
    ]
  )

  workerPool.stdout.pipe(process.stdout)
  workerPool.stderr.pipe(process.stderr)

  runner = await dagsby.createRunner({
    pools: [{ socketPort, httpPort }],
  })

  // Create a simple task
  task = await dagsby.createTask({
    func: async args => {
      const renderHTML = require(args.renderHtmlPath).renderHTML
      await renderHTML(args)
    },
    // Written using Arvo's schema language.
    argsSchema: [
      {
        name: "envVars",
        type: { type: "array", items: { type: "array", items: "string" } },
      },
      {
        name: "htmlComponentRendererPath",
        type: "string",
      },
      { name: "renderHtmlPath", type: "string", aliases: [], _order: 1 },
      {
        name: "paths",
        type: { type: "array", items: "string" },
      },
    ],
    returnOnlyErrors: true,
  })

  // Setup the task on the worker pool(s).
  await runner.setupTask(task)
})()

async function renderHTML(args) {
  const result = await runner.executeTask({ task, args })
}

// Note: this doesn't check for conflicts between module exports
module.exports = { renderHTML }
