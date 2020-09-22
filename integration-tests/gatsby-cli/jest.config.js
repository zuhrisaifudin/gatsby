const baseConfig = require(`../jest.config.js`)

module.exports = {
  ...baseConfig,
  globalSetup: "<rootDir>/integration-tests/gatsby-cli/jest.boot.js",
  rootDir: `../../`,
}
