const path = require(`path`)
const { sync } = require(`execa`)

module.exports = () => {
  console.log(`Linking "gatsby-cli" so it's available as global command`)
  console.log(`Tests will use global CLI to invoke commands`)
  const cwd = path.join(__dirname, `..`, `..`, `packages`, `gatsby-cli`)
  sync(`npm`, [`link`], {
    cwd,
    stdio: `inherit`,
  })
}
