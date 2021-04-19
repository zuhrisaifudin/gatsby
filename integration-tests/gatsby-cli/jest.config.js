const fs = require(`fs`)
const path = require(`path`)
const os = require(`os`)

// install global gatsby-cli to tmp dir to simulate sandbox
const GLOBAL_GATSBY_CLI_LOCATION = (process.env.GLOBAL_GATSBY_CLI_LOCATION = fs.mkdtempSync(
  path.join(os.tmpdir(), `gatsby-cli-`)
))

module.exports = {
  testPathIgnorePatterns: [`/node_modules/`, `__tests__/fixtures`, `.cache`],
  globalSetup: "<rootDir>/jest.boot.js",
  globals: {
    GLOBAL_GATSBY_CLI_LOCATION,
  },
}
