#!/usr/bin/env node

const top = require(`process-top`)()
const { fetchFileAndEmitProgress } = require(`./fetch-file`)
const StreamSpeed = require("streamspeed")
const _ = require(`lodash`)
const aggregator = require(`./src/aggregators`)
const mitt = require(`mitt`)
const { default: PQueue } = require("p-queue")

const emitter = mitt()
const queue = new PQueue({ concurrency: 50 })

let startTime = Date.now()
let count = 0
queue.on("active", () => {
  count += 1
  if (count % 50 === 0) {
    console.log(
      `${process.pid} Working on item #${count}.  Size: ${queue.size}  Pending: ${queue.pending}`
    )
    const elapsedSeconds = (Date.now() - startTime) / 1000
    console.log({ elapsedSeconds })
    console.log(`${(count / elapsedSeconds).toFixed(1)} downloads / second`)
  }
})

// Worker aggregate stats
const hostSpeeds = {}
const lastSpeedPerHost = {}
const bytesPerHost = new Map()
const reformattedBytesPerHost = {}

let root = { files: {}, hosts: {} }

const throttledSend = _.throttle(record => {
  process.send(record)
}, 100)

emitter.on(`progress`, event => {
  root = aggregator(root, event)

  // Make sure we record when the speed goes to zero
  root = aggregator(root, {
    type: `streamSpeedUpdate`,
    data: {
      host: event.data.host,
      speed: hostSpeeds[event.data.host].getSpeed(),
    },
  })

  throttledSend({ type: `update`, data: root })
})

process.on(`message`, message => {
  if (message.type === `downloadFile`) {
    // console.log(process.pid, `start download`, message)
    queue.add(() => {
      return fetchFileAndEmitProgress(message.data, emitter).then(
        ({ host, responseStream }) => {
          // console.log(`got return`, host)
          if (!hostSpeeds[host]) {
            hostSpeeds[host] = new StreamSpeed()
          }

          hostSpeeds[host].add(responseStream)

          hostSpeeds[host].on(`speed`, speed => {
            root = aggregator(root, {
              type: `streamSpeedUpdate`,
              data: {
                host: host,
                speed: speed,
              },
            })
          })
          return new Promise(resolve => {
            responseStream.on(`end`, resolve)
          })
        }
      )
    })
  }
})

setInterval(function () {
  process.send({
    type: `workerStats`,
    event: {
      ...top.toJSON(),
      system: top.cpu().system / top.cpu().time,
      user: top.cpu().user / top.cpu().time,
    },
  })
}, 200)
