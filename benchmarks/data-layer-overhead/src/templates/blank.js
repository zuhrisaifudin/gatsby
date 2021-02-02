import React from "react"

export default ({ data }) => <div>Yo!</div>

export const pageQuery = graphql`
  query DataByID($id: String!) {
    tatay(id: { eq: $id }) {
      id
      childAnak {
        id
      }
    }
  }
`
