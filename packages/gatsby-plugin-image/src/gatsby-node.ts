export * from "./preprocess-source"

import { GatsbyNode } from "gatsby"
import path from "path"

export const onCreateBabelConfig: GatsbyNode["onCreateBabelConfig"] = ({
  actions,
  store,
}) => {
  const root = store.getState().program.directory

  const cacheDir = path.join(
    root,
    `.cache`,
    `caches`,
    `gatsby-plugin-static-image`
  )

  actions.setBabelPlugin({
    name: require.resolve(`./babel-plugin-parse-static-images`),
    options: {
      cacheDir,
    },
  })
}

export const onCreateWebpackConfig: GatsbyNode["onCreateWebpackConfig"] = ({
  stage,
  plugins,
  actions,
}) => {
  if (stage !== `develop` && stage !== `build-javascript`) {
    return
  }

  actions.setWebpackConfig({
    plugins: [
      plugins.define({
        [`global.GATSBY___IMAGE`]: true,
      }),
    ],
  })
}
