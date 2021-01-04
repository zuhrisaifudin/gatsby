const { createWriteStream } = require("fs")
const { pipeline } = require("stream")
const { promisify } = require("util")
// const fetch = require("node-fetch")
const fetch = require("@adobe/node-fetch-retry")
var PassThrough = require("stream").PassThrough
const _ = require(`lodash`)
const createWindow = require("live-moving-average")
const StreamSpeed = require("streamspeed")
const http = require("http")
const https = require("https")
const prettyBytes = require(`pretty-bytes`)

const streamPipeline = promisify(pipeline)

const httpAgent = new http.Agent({
  keepAlive: true,
})
const httpsAgent = new https.Agent({
  keepAlive: true,
})

let total = 0

exports.fetchFileAndEmitProgress = async (url, emitter) => {
  const filePath = require(`path`).parse(url).base
  const host = require(`url`).parse(url).host

  const response = await fetch(url, {
    agent: function (_parsedURL) {
      if (_parsedURL.protocol == "http:") {
        return httpAgent
      } else {
        return httpsAgent
      }
    },
  })

  response.body.on(`data`, chunk => {
    emitter.emit(`progress`, {
      type: `fileChunkUpdate`,
      data: { bytes: chunk.length, host, url, time: Date.now() / 1000 },
    })
  })
  response.body.on(`end`, () => {
    setTimeout(
      () =>
        emitter.emit(`progress`, {
          type: `fileChunkUpdate`,
          data: { bytes: 0, host, url, time: Date.now() / 1000 },
        }),
      100
    )
  })

  const writeStream = createWriteStream(filePath)

  if (!response.ok) {
    throw new Error(`unexpected response ${response.statusText}`)
  }

  streamPipeline(
    response.body,
    // trackProgress({ emitter, host, url }),
    writeStream
  )

  return { emitter, host, responseStream: response.body }
}

const trackProgress = function ({ emitter, host, url }) {
  var pt = new PassThrough({})

  pt.on("pipe", function (stream) {
    pt.on("data", function (chunk) {
      emitter.emit(`progress`, {
        type: `fileChunkUpdate`,
        data: { bytes: chunk.length, host, url, time: Date.now() / 1000 },
      })
    })
  })

  return pt
}
