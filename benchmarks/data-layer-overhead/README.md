# data-layer-overhead benchmark

Stress tests the data layer by creating lots of tiny nodes & pages.

Defaults to building a site with 5k nodes. Set the `NUM_NODES` environment variable to change that e.g. `NUM_NODES=25000 gatsby build`

The goal is to use this to reduce the overhead of using the data layer vs. createPages. Currently the overhead is ~25%.

# Running the benchmark

First, install node modules required by package.json. This is needed only one time. Then run the build

```shell
npm install
npm run build
```
