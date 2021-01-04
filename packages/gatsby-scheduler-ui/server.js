const io = require("socket.io")(3000)
const { promisify } = require("util")
const { default: PQueue } = require("p-queue")
const { pipeline } = require("stream")
const imageUrls = require(`../../benchmarks/image-processing/plugins/gatsby-source-remote-images/urls.json`)
const { fetchFileAndEmitProgress } = require(`./fetch-file`)
const _ = require(`lodash`)
const execa = require(`execa`)
const aggregator = require(`./src/aggregators`)
const top = require(`process-top`)()

const queue = new PQueue({ concurrency: 50 })
queue.pause()
let startTime
let count = 0
queue.on("active", () => {
  count += 1
  if (count % 100 === 0) {
    console.log(
      `Working on item #${count}.  Size: ${queue.size}  Pending: ${queue.pending}`
    )
    const elapsedSeconds = (Date.now() - startTime) / 1000
    console.log({ elapsedSeconds })
    console.log(`${(count / elapsedSeconds).toFixed(1)} downloads / second`)
  }
})

const throttledSendHostSpeed = _.throttle((socket, record) => {
  socket.emit(`hostSpeed`, record)
}, 100)

const trackProgress = function (socket, name) {
  const throttledSend = _.throttle((socket, object) => {
    socket.emit(`stats`, object)
  }, 100)
  const avgBytesPerSecond = createWindow(500) // size of 3, fill with 0
  var pt = new PassThrough({})
  let ss = new StreamSpeed()
  let lastSpeed = 0
  ss.add(pt)
  ss.on("speed", speed => {
    lastSpeed = speed
  })

  let totalBytes = 0
  let lastTime

  pt.on("pipe", function (stream) {
    // if (total) {
    // // var bar = new ProgressBar(tokens, options);
    pt.on("data", function (chunk) {
      // const newTime = Date.now()
      // let bytesPerSecond
      // // console.log({ newTime, lastTime })
      // if (lastTime) {
      // const diff = newTime - lastTime
      // const diffInSeconds = diff / 1000
      // // console.log({ name, diff, diffInSeconds })
      // bytesPerSecond = chunk.length / diffInSeconds
      // // console.log({ bytesPerSecond })
      // }
      // lastTime = newTime
      // if (bytesPerSecond) {
      // avgBytesPerSecond.push(bytesPerSecond)
      // }

      totalBytes += chunk.length
      // console.log({
      // totalBytes,
      // bytesPerSecond,
      // name,
      // chunkLength: chunk.length,
      // movingAverage: avgBytesPerSecond.get(),
      // })
      // throttledSend(socket, {
      // totalBytes,
      // name,
      // time: Date.now() / 1000,
      // bytesPerSecond: lastSpeed,
      // })
    })
  })

  return pt
}

const streamPipeline = promisify(pipeline)
const speedPerHost = new Map()
const lastSpeedPerHost = {}
const bytesPerHost = {}

let started = false
io.on("connection", async socket => {
  if (!started) {
    started = true
    // fetchFileAndEmitProgress({
    // url: "https://klett.hu/download/great_gatsby_web.pdf",
    // socket,
    // name: `great-gatsby.pdf`,
    // })
    // fetchFileAndEmitProgress({
    // url:
    // "https://web1.cachefly.net/speedtest/downloading?n=0.754670513415236",
    // socket,
    // name: `cachefly.zip`,
    // })
    // fetchFileAndEmitProgress({
    // url: "http://ipv4.download.thinkbroadband.com/512MB.zip",
    // socket,
    // name: `thinkbroadband-512.zip`,
    // })
    // fetchFileAndEmitProgress({
    // url: "http://ipv4.download.thinkbroadband.com/100MB.zip",
    // socket,
    // name: `thinkbroadband-100.zip`,
    // })
    // fetchFileAndEmitProgress({
    // urls: [
    // ...imageUrls.slice(0, 1000),
    // "http://ipv4.download.thinkbroadband.com/100MB.zip",
    // "https://web1.cachefly.net/speedtest/downloading?n=0.754670513415236",
    // "https://klett.hu/download/great_gatsby_web.pdf",
    // "https://homepages.cae.wisc.edu/~ece533/images/airplane.png",
    // `https://homepages.cae.wisc.edu/~ece533/images/arctichare.png`,
    // `https://homepages.cae.wisc.edu/~ece533/images/baboon.png`,
    // `https://homepages.cae.wisc.edu/~ece533/images/cameraman.tif`,
    // `https://homepages.cae.wisc.edu/~ece533/images/cat.png`,
    // `https://homepages.cae.wisc.edu/~ece533/images/fprint3.pgm`,
    // `https://homepages.cae.wisc.edu/~ece533/images/fruits.png`,
    // `https://homepages.cae.wisc.edu/~ece533/images/frymire.png`,
    // `https://homepages.cae.wisc.edu/~ece533/images/girl.png`,
    // `https://homepages.cae.wisc.edu/~ece533/images/goldhill.bmp`,
    // `https://homepages.cae.wisc.edu/~ece533/images/goldhill.png`,
    // `https://homepages.cae.wisc.edu/~ece533/images/lena.bmp`,
    // `https://homepages.cae.wisc.edu/~ece533/images/lena.png`,
    // `https://homepages.cae.wisc.edu/~ece533/images/lena.ppm`,
    // `https://homepages.cae.wisc.edu/~ece533/images/Lenaclor.ppm`,
    // `https://homepages.cae.wisc.edu/~ece533/images/monarch.png`,
    // `https://homepages.cae.wisc.edu/~ece533/images/mountain.png`,
    // `https://homepages.cae.wisc.edu/~ece533/images/mountain.bmp`,
    // `https://homepages.cae.wisc.edu/~ece533/images/p64int.txt`,
    // `https://homepages.cae.wisc.edu/~ece533/images/peppers.png`,
    // `https://homepages.cae.wisc.edu/~ece533/images/pool.png`,
    // `https://homepages.cae.wisc.edu/~ece533/images/sails.bmp`,
    // `https://homepages.cae.wisc.edu/~ece533/images/sails.png`,
    // `https://homepages.cae.wisc.edu/~ece533/images/serrano.png`,
    // `https://homepages.cae.wisc.edu/~ece533/images/tulips.png`,
    // `https://homepages.cae.wisc.edu/~ece533/images/us021.pgm`,
    // `https://homepages.cae.wisc.edu/~ece533/images/us092.pgm`,
    // `https://homepages.cae.wisc.edu/~ece533/images/watch.png`,
    // `https://homepages.cae.wisc.edu/~ece533/images/zelda.png`,
    // ],
    // socket,
    // })
    // fetchFileAndEmitProgress(
    // "http://speedtest-ca.turnkeyinternet.net/100mb.bin"
    // )
    // fileDownload.on(`progress`, data => {
    // // console.log(`progress`, data)
    // socket.emit(`hostSpeed`, data)
    // })

    // Start child processes.
    const subprocess = execa.node(`child.js`)
    const subprocess2 = execa.node(`child.js`)
    const subprocess3 = execa.node(`child.js`)
    subprocess.stdout.pipe(process.stdout)
    subprocess.stderr.pipe(process.stderr)
    subprocess2.stdout.pipe(process.stdout)
    subprocess2.stderr.pipe(process.stderr)
    subprocess3.stdout.pipe(process.stdout)
    subprocess3.stderr.pipe(process.stderr)

    let lastRoot
    let lastRoot2
    let lastRoot3
    setInterval(function () {
      socket.emit(`workerStats`, {
        workerId: 0,
        ...top.toJSON(),
        system: top.cpu().system / top.cpu().time,
        user: top.cpu().user / top.cpu().time,
      })
    }, 200)
    subprocess.on(`message`, data => {
      if (data.type === `workerStats`) {
        socket.emit(`workerStats`, { workerId: 1, ...data.event })
      }
      if (data.type === `update`) {
        if (lastRoot) {
          const secondsPassed = data.data.end - lastRoot.end
          const newBytes =
            data.data.hosts.total.totalBytes - lastRoot.hosts.total.totalBytes
          const speed = newBytes / secondsPassed
          data.data.hosts.total.speed = speed
        }
        lastRoot = _.cloneDeep(data.data)
        const root = aggregator(
          {},
          {
            type: `combineRoots`,
            data: [
              _.cloneDeep(lastRoot),
              _.cloneDeep(lastRoot2),
              _.cloneDeep(lastRoot3),
            ],
          }
        )
        socket.emit(`hostSpeed`, root)
      }
    })
    subprocess2.on(`message`, data => {
      // console.log(`message from child`, data)
      if (data.type === `workerStats`) {
        socket.emit(`workerStats`, { workerId: 2, ...data.event })
      }
      if (data.type === `update`) {
        if (lastRoot2) {
          const secondsPassed = data.data.end - lastRoot2.end
          const newBytes =
            data.data.hosts.total.totalBytes - lastRoot2.hosts.total.totalBytes
          const speed = newBytes / secondsPassed
          data.data.hosts.total.speed = speed
        }
        lastRoot2 = _.cloneDeep(data.data)
        const root = aggregator(
          {},
          {
            type: `combineRoots`,
            data: [
              _.cloneDeep(lastRoot),
              _.cloneDeep(lastRoot2),
              _.cloneDeep(lastRoot3),
            ],
          }
        )
        socket.emit(`hostSpeed`, root)
      }
    })
    subprocess3.on(`message`, data => {
      // console.log(`message from child`, data)
      if (data.type === `workerStats`) {
        socket.emit(`workerStats`, { workerId: 3, ...data.event })
      }
      if (data.type === `update`) {
        if (lastRoot3) {
          const secondsPassed = data.data.end - lastRoot3.end
          const newBytes =
            data.data.hosts.total.totalBytes - lastRoot3.hosts.total.totalBytes
          const speed = newBytes / secondsPassed
          data.data.hosts.total.speed = speed
        }
        lastRoot3 = _.cloneDeep(data.data)
        const root = aggregator(
          {},
          {
            type: `combineRoots`,
            data: [
              _.cloneDeep(lastRoot),
              _.cloneDeep(lastRoot2),
              _.cloneDeep(lastRoot3),
            ],
          }
        )
        socket.emit(`hostSpeed`, root)
      }
    })
    // console.log(subprocess)

    // subprocess.send({
    // type: `downloadFile`,
    // data: "http://speedtest-ca.turnkeyinternet.net/100mb.bin",
    // })
    const urls = [
      // Try rewriting the data updates with immer`
      `https://homepages.cae.wisc.edu/~ece533/images/pool.png`,
      `https://homepages.cae.wisc.edu/~ece533/images/sails.bmp`,
      `https://homepages.cae.wisc.edu/~ece533/images/sails.png`,
      `https://homepages.cae.wisc.edu/~ece533/images/serrano.png`,
      `https://homepages.cae.wisc.edu/~ece533/images/tulips.png`,
      `https://homepages.cae.wisc.edu/~ece533/images/us021.pgm`,
      `https://homepages.cae.wisc.edu/~ece533/images/us092.pgm`,
      `https://homepages.cae.wisc.edu/~ece533/images/watch.png`,
      `https://homepages.cae.wisc.edu/~ece533/images/zelda.png`,
    ]
    urls.forEach(url =>
      Math.random() > 0.5
        ? subprocess.send({
            type: `downloadFile`,
            data: url,
          })
        : subprocess2.send({
            type: `downloadFile`,
            data: url,
          })
    )
    imageUrls.slice(0, 1000).forEach(url => {
      const randomNum = Math.random()
      if (randomNum < 0.333) {
        subprocess.send({
          type: `downloadFile`,
          data: url,
        })
      } else if (randomNum < 0.6666) {
        subprocess2.send({
          type: `downloadFile`,
          data: url,
        })
      } else {
        subprocess3.send({
          type: `downloadFile`,
          data: url,
        })
      }
    })

    // Isolate code to fetch a file
    try {
      await subprocess
    } catch (error) {
      console.log(error)
      console.log(subprocess.killed) // true
      console.log(error.isCanceled) // true
    }
  }
})
