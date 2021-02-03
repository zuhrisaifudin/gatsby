import { queryRunner } from "./query-runner"
const queue = require(`fastq`)(worker, 15)
const { store } = require(`../redux`)

function worker({ id, graphqlRunner, activity }, cb) {
  const state = store.getState()
  const page = state.pages.get(id)
  if (page) {
    // console.log(id, page)
    const component = state.components.get(page.componentPath)
    const { path, componentPath, context } = page
    const { query } = component
    const job = {
      id: path,
      query,
      isPage: true,
      componentPath,
      context: {
        ...page,
        ...context,
      },
    }
    // console.log(job)
    queryRunner(graphqlRunner, job, activity?.span).then(result => {
      // console.log(result)
      cb()
    })
  }
}

export default queue
