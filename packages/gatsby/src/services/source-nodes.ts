import sourceNodesAndRemoveStaleNodes from "../utils/source-nodes"
import reporter from "gatsby-cli/lib/reporter"
import { IDataLayerContext } from "../state-machines/data-layer/types"
import { assertStore } from "../utils/assert-store"
import { IGatsbyPage } from "../redux/types"
import { findChangedPages } from "../utils/changed-pages"

export async function sourceNodes({
  parentSpan,
  webhookBody,
  webhookSourcePluginName,
  store,
  deferNodeMutation = false,
}: Partial<IDataLayerContext>): Promise<{
  deletedPages: Array<string>
  changedPages: Array<string>
}> {
  assertStore(store)

  console.log(`source-nodes`, 0)
  const activity = reporter.activityTimer(`source and transform nodes`, {
    parentSpan,
  })
  activity.start()
  const currentPages = new Map<string, IGatsbyPage>(store.getState().pages)
  console.log(`source-nodes`, 1)
  await sourceNodesAndRemoveStaleNodes({
    parentSpan: activity.span,
    deferNodeMutation,
    webhookBody,
    pluginName: webhookSourcePluginName,
  })
  console.log(`source-nodes`, 2)

  reporter.verbose(`Checking for deleted pages`)

  const tim = reporter.activityTimer(`Checking for changed pages`)
  console.log(`source-nodes`, 3)
  tim.start()

  const { changedPages, deletedPages } = findChangedPages(
    currentPages,
    store.getState().pages
  )

  reporter.verbose(
    `Deleted ${deletedPages.length} page${deletedPages.length === 1 ? `` : `s`}`
  )

  reporter.verbose(
    `Found ${changedPages.length} changed page${
      changedPages.length === 1 ? `` : `s`
    }`
  )
  tim.end()

  activity.end()
  return {
    deletedPages,
    changedPages,
  }
}
