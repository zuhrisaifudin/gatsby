const fetch = require("@adobe/node-fetch-retry")

let total = 0

;(async () => {
  const response = await fetch(
    `http://speedtest-ca.turnkeyinternet.net/100mb.bin`
  )
  response.body.on(`data`, chunk => {
    total += chunk.length
    console.log(total, require(`pretty-bytes`)(total))
  })
})()
