const NUM_NODES = parseInt(process.env.NUM_NODES || 5000, 10)

const component = require.resolve(`./src/templates/blank.js`)
exports.createPages = ({ actions: { createPage } }) => {
  for (let step = 0; step < NUM_NODES; step++) {
    createPage({
      path: `/path/${step}/`,
      component,
      context: {
        id: step.toString(),
      },
    })
  }
}

exports.sourceNodes = ({ actions: { createNode } }) => {
  for (let step = 0; step < NUM_NODES; step++) {
    const stepAsString = step.toString()
    createNode({
      // Data for the node.
      a: true,

      // Required fields.
      id: stepAsString,
      parent: null,
      children: [],
      internal: {
        type: `Tatay`,
        contentDigest: stepAsString,
      },
    })
  }
}

exports.onCreateNode = ({ node, actions }) => {
  if (node.internal.type === `Tatay`) {
    const { createNode } = actions
    // Transform the new node here and create a new node or
    // create a new node field.
    const childNode = {
      // Data for the node.
      b: true,

      // Required fields.
      id: node.id + `-anak`,
      parent: node.id,
      children: [],
      internal: {
        type: `Anak`,
        contentDigest: node.id + `-anak`,
      },
    }

    actions.createNode(childNode)
    actions.createParentChildLink({ parent: node, child: childNode })
  }
}
