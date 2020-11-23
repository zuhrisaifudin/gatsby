- Start Date: 2020-11-20
- RFC PR: (leave this empty)
- Gatsby Issue: (leave this empty)

# Summary

Add a `<Head>` component to Gatsby as the blessed way of adding meta tags to pages.

# Basic example

```JS
// src/pages/about.js
import React from "react"
import { Head } from "gatsby"

export default (props) => (
  <>
    <Head
      // Basic information handled via props
      title="About Dick's Flower Shop"
      description="Who is Dick and why did he create yet another flower shop"
    >
      {/* Extra meta tags can be added by rendering them as children */}
      <meta name="twitter:site" content="@dicksflowers" />
    </Head>
    <h1>About Us</h1>
  </>
)
```

# Motivation

Gatsby is fantastic for SEO thanks to its outstanding performance. However, we tell users to add page metadata by setting up a non-core plugin (react-helmet) and copy-and-pasting code (!) from [our docs](https://www.gatsbyjs.com/docs/add-seo-component/).

This is not only confusing and more complex than it needs to be, but also not maintainable. We can never update or improve code users copy-and-paste. We also cannot bake best practices into our SEO setup to make every Gatsby site shine across search and social media by default.

> _“I spent 3ish hours building a landing page last week and 3ish more hours trying to get a darned open graph image to show up in all the right social media tags. I think something like this would be fantastic.”_
>
> – Kyle Gill

# Detailed design

In general, this component should work similarly to the [`<SEO>` component from our docs](https://www.gatsbyjs.com/docs/add-seo-component/) and be based on [react-helmet](https://github.com/nfl/react-helmet), the standard in the React community.

Compared to normal react-helmet, this `<Head>` component can leverage the information Gatsby has about a website (specifically, the `siteMetadata` and current path). On top of that, basic information, such as the page title, is provided via props (instead of manually via meta tags) allowing us to generate a set of "best practice" meta tags that work well across search and social media automatically.

## API

Users define the default metadata in the `gatsby-config.js` via the `siteMetadata` field:

```JS
// gatsby-config.js
module.exports = {
  siteMetadata: {
    title: "Dick's Flower Shop",
    description: "Get a beautiful flower bouquet delivered to your doorstep in less than an hour!",
    baseUrl: "https://dicks.flowers",
    image: "/images/social-media.png",
  }
}
```

The component is automatically rendered on every page with the default data. That means in the example above, all pages will show "Dick's Flower Shop" as the title.

To override the defaults for a specific page, users import and render the `<Head>` component on a page and provide different data:

```JS
// src/pages/bouquet/{Bouquet.name}.js
import React from "react"
import { Head } from "gatsby"

export default (props) => (
  <>
    <Head
      // Basic information handled via props
      title={props.data.bouquet.name}
      description={`Get ${props.data.bouquet.name} delivered to your doorstep in less than an hour`}
      // Since image="" is not specified it will be set to the default
    >
      {/* Extra meta tags can be added by rendering them as children */}
      <meta name="twitter:site" content="@dicksflowers" />
    </Head>
    <h1>{props.data.bouquet.name}</h1>
  </>
)

export const query = graphql`
  query ($id: String) {
    bouquet(id: { eq: $id }) {
      id
      name
    }
  }
`
```

To provide a great experience across search and social media, four pieces of information need to be present on every page:

- Title (e.g. "Dick's Flower Shop")
- Description (e.g. "Get a beautiful flower bouquet delivered to your doorstep in less than an hour!")
- Base URL (e.g. "https://dicks.flowers")
- Meta Image (e.g. "/images/social-media.png")

With these four basic pieces of information we can create [a set of meta tags](https://moz.com/blog/meta-data-templates-123) that work across [search](https://moz.com/blog/the-ultimate-guide-to-seo-meta-tags) and [social](https://ogp.me/) [media](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/summary-card-with-large-image):

```HTML
<title>${title}</title>
<meta name="description" content="${description}" />

<!-- Twitter Card data -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${image}">

<!-- Open Graph data -->
<meta property="og:title" content="${title}" />
<meta property="og:type" content="website" />
<meta property="og:url" content="${baseUrl}${location.pathname}" />
<meta property="og:image" content="${image}" />
<meta property="og:description" content="${description}" />
```

To ensure we can always inject these (duplicate) meta tags for the basic information, we let users provide the defaults from siteMetadata (see example above) and users provide the overrides for certain pages via props:

```JSX
import { Head } from "gatsby"

<Head
  title={props.data.bouquet.name}
  description={`Get ${props.data.bouquet.name} delivered to your doorstep in less than an hour`}
  image={props.data.bouquet.image}
  // We determine and set the URL automatically. It does not need to be provided via props.
>
  {/* Extra meta tags can be added via children */}
  <meta name="twitter:site" content="@dicksflowers" />
</Head>
```

# Drawbacks

- This increases our API surface and will need a lot of documentation as well as busywork to update starters and examples
- We will own not only react-helmet's API surface area but also issues from our users perspective. If react-helmet has a bug, they'll complain to us.
- This will take a while to decide on and implement, distracting us from potentially more important features

# Alternatives

## Transparent react-helmet wrapper

Rather than owning the entire API surface area (including bugs) of react-helmet I considered "react-helmet built into Gatsby". That could look like this:

```JS
import { Helmet } from "gatsby"

<Helmet>
  <meta name="twitter:site" content="@dicksflowers" />
</Helmet>
```

The upsides of doing this would be that documentation would be much less of a chore (we could point to the react-helmet documentation for advanced use cases) and we wouldn't own react-helmets' bugs (users would know it's a react-helmet bug rather than a Gatsby bug).

However, that could also backfire as it wouldn't be _just_ react-helmet. Instead, it would have to be a wrapper around react-helmet that supports the `siteMetadata` defaulting and basic information support described above. That means the _real_ API for users would look like this:

```JS
import { Helmet } from "gatsby"

// Note how we pass title="" via props rather than rendering <title>
<Helmet title="Dick's Flower Shop">
  <meta name="twitter:site" content="@dicksflowers" />
</Helmet>
```

That is confusing, as the `title` prop is _not_ part of the react-helmet API, and neither is the `siteMetadata` support. So we would have to documentat that yes, this is react-helmet, however it's our special version of it.

That feels like more trouble than it's worth to me. I think the tradeoff of owning that API surface area and the bugs are preferable.

## Transparent react-helmet with `Meta` components

To combat the weirdness of wrapping react-helmet, we could also consider introducing special `<Meta>` (and `<MetaTitle>`?) components that would be used in place of the standard `<meta>` elements.

This would allow us to turn `<MetaTitle>` and other `<Meta>` components into the recommended set of meta tags automatically. Example usage would look like this:

```JSX
import { Helmet, Meta, MetaTitle } from "gatsby"

<Helmet>
  <MetaTitle>Title</MetaTitle>
  <Meta name="description" content="Description" />
  <Meta name="twitter:site" content="@username" />
</Helmet>

// ...would turn into...

// General tags
<meta name="twitter:card" content="summary_large_image" />
<meta property="og:type" content="website" />
<meta property="og:url" content="${baseUrl}${location.pathname}" />

// Title
<title>Title</title>
<meta name="twitter:title" content="Title" />
<meta property="og:title" content="Title" />

// Description
<meta name="description" content="Description" />
<meta name="twitter:description" content="Description" />
<meta property="og:description" content="Description" />

// Standard Meta tag
<meta name="twitter:site" content="@username" />
```

The upside is that this makes the boundary between the (now completely bog standard) react-helmet API and the Gatsby-specific additions very clear. We could again refer straight to the react-helmet documentation.

The downside is that it's more verbose. It could lead to users adding redundant meta tags that we theoretically already add automatically, for example:

```JSX
<Helmet>
  <MetaTitle>Title</MetaTitle>
  {/* REDUNDANT: <MetaTitle> already does this automatically for them */}
  <Meta property="og:title" content="Title" />
</Helmet>
```

# Adoption strategy

This will work out of the box in all existing Gatsby apps and will be interoperable with the standard `<SEO>` component highlighted in our docs as it also uses react-helmet.

# How we teach this

We must add dedicated documentation for this feature and API surface area, as well as write blog posts on migrating to this new setup.

# Unresolved questions

## 1. How do we let users set default meta tags that should be rendered on every page but not in the `siteMetadata`?

For example, `<meta name="twitter:site">` should be set to the site's twitter username on every page (e.g. "@dicksflowers"). Sure, we could add fields for every single potential meta tag (`twitterUsername`) but that feels unergonomic as there are [a lot of meta tags](https://moz.com/blog/meta-data-templates-123).

Instead, I think we should add a way for users to specify additional "default" meta tags somehow. Maybe we should tell them to render the `<Head>` component in the `gatsby-browser/ssr.js` `wrapPageElement` method like so?

```JS
// gatsby-browser.js
exports.wrapPageElement = ({ element, props }) => {
  return (
    <Layout {...props}>
      <Head>
        {/* Default meta tags applied to every page specified here */}
        <meta name="twitter:site" content="@dicksflowers" />
      </Head>
    </Layout>
  )
}
```

```JS
// gatsby-ssr.js
exports.wrapPageElement = require(`./gatsby-browser`).wrapPageElement;
```

## 2. Do we enforce that users pass the basic information via props, rather than rendering the meta tags for it?

Even though it would work, we don't want users to render the basic information meta tags themselves as they could forget some parts of the combination:

```HTML
<Head>
  <title>Dick's Flower Shop</title>
</Head>
```

Rather, they should pass the basic information via props so it turns into the correct set of meta tags automatically:

```HTML
<Head title="Dick's Flower Shop" />
<!-- turns into -->
<title>Dick's Flower Shop</title>
<meta name="twitter:title" content="Dick's Flower Shop">
<meta property="og:title" content="Dick's Flower Shop" />
```

Do we want to enforce that by warning/erroring in the console if they provide meta tags that are also in the basic information?

## 3. Do we want to fork react-helmet?

We could fork react-helmet to avoid blocking users by upstream bugs we cannot fix. However, we might not be able to benefit from upstream fixes then as our code could diverge from theirs.
