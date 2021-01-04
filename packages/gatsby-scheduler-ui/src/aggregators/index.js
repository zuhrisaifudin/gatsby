const _ = require(`lodash`)

const setupHost = (root, host) =>
  (root.hosts[host] = { totalBytes: 0, speed: 0 })

let just100 = 0
let lastLogged = 0
module.exports = function (root, event) {
  if (event.type === `fileChunkUpdate`) {
    if (
      event.data.url === `http://speedtest-ca.turnkeyinternet.net/100mb.bin`
    ) {
      just100 += event.data.bytes
      // console.log({ just100, lastLogged, diff: just100 - lastLogged })
      if (just100 - lastLogged > 10000000) {
        lastLogged = just100
        console.log({ just100: require(`pretty-bytes`)(just100) })
      }
    }
    root.start = Math.min(root.start || Infinity, event.data.time)
    root.end = Math.max(root.end || 0, event.data.time)

    // Update files
    if (!root[`files`][event.data.url]) {
      root[`files`][event.data.url] = {
        url: event.data.url,
        host: event.data.host,
        totalBytes: event.data.bytes,
      }
    } else {
      root[`files`][event.data.url].totalBytes += event.data.bytes
    }

    // Update the host totals
    if (!root.hosts[event.data.host]) {
      setupHost(root, event.data.host)
    }
    root[`hosts`][event.data.host].totalBytes += event.data.bytes

    // Update the totals
    if (!root.hosts[`total`]) {
      setupHost(root, `total`)
    }
    root[`hosts`][`total`].totalBytes += event.data.bytes
  }

  if (event.type === `streamSpeedUpdate`) {
    if (!root.hosts[event.data.host]) {
      setupHost(root, event.data.host)
    }

    root[`hosts`][event.data.host].speed = event.data.speed

    // Update the totals
    if (!root.hosts[`total`]) {
      setupHost(root, `total`)
    }
    root[`hosts`][`total`].speed = _.sumBy(Object.keys(root.hosts), host => {
      // Don't count itself!
      if (host === `total`) {
        return 0
      } else {
        return root.hosts[host].speed
      }
    })
  }

  if (event.type === `combineRoots`) {
    const reducer = (accumulator, value, index) => {
      if (_.isEmpty(value)) {
        return accumulator
      }
      Object.keys(value.hosts).forEach(host => {
        accumulator.hostNames.add(host)
        accumulator.start = Math.min(accumulator.start || Infinity, value.start)
        accumulator.end = Math.max(accumulator.end || 0, value.end)
        if (!accumulator[host]) {
          accumulator[host] = value.hosts[host]
        } else {
          accumulator[host].speed += value.hosts[host].speed || 0
          accumulator[host].totalBytes += value.hosts[host].totalBytes
        }
      })

      return accumulator
    }
    // console.log(event.data[0].files)
    root.hostNames = new Set()
    root.time = Date.now() / 1000
    root = event.data.reduce(reducer, root)

    root.hostNames = [...root.hostNames]
  }

  return root
}
