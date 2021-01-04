const execa = require(`execa`)

;(async () => {
  const subprocess = execa.node(`child.js`)
  subprocess.on(`message`, data => {
    console.log(`message from child`, data)
  })
  // console.log(subprocess)

  subprocess.send(`ping`)

  // Isolate code to fetch a file
  try {
    await subprocess
  } catch (error) {
    console.log(error)
    console.log(subprocess.killed) // true
    console.log(error.isCanceled) // true
  }
})()
