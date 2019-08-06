<p align="center">
  <a href="https://vertx-graphql.github.io">
    <img alt="Vertx GraphQL" src="https://avatars3.githubusercontent.com/u/44706646?s=200&v=4" width="60" />
  </a>
</p>
<h1 align="center">
  Vert.x GraphQL
</h1>

<h3 align="center">
  Blazing fast, instant realtime GraphQL APIs on Vert.x
</h3>
<p align="center">
  Vert.x GraphQL is a free and open source library based on JavaScript for Vert.x that helps developers to build fast GraphQL services and apps.
</p>

<p align="center">
  <a href="https://github.com/vertx-graphql/vertx-graphql/blob/master/LICENSE">
    <img src="https://img.shields.io/badge/license-Apache 2.0-blue.svg" alt="Vert.x GraphQL is released under the Apache 2.0 license." />
  </a>
  <a href="https://www.npmjs.org/package/vertx-graphql">
    <img src="https://img.shields.io/npm/v/vertx-graphql.svg" alt="Current npm package version." />
  </a>
  <a href="https://npmcharts.com/compare/vertx-graphql?minimal=true">
    <img src="https://img.shields.io/npm/dm/vertx-graphql.svg" alt="Downloads per month on npm." />
  </a>
  <a href="https://npmcharts.com/compare/vertx-graphql?minimal=true">
    <img src="https://img.shields.io/npm/dt/vertx-graphql.svg" alt="Total downloads on npm." />
  </a>
  <a href="https://vertx-graphql.github.io/contributing/how-to-contribute/">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs welcome!" />
  </a>
</p>

## What’s In This Document

- [Get Up and Running in 5 Minutes](#-get-up-and-running-in-5-minutes)
- [Manual Installation](#-manual-installation)
- [Code of Conduct](#-code-of-conduct)
- [How to Contribute](#-how-to-contribute)
- [License](#license)

## Get Up and Running in 5 Minutes

You can get a new Vert.x GraphQL service up and running on your local dev environment in 5 minutes with these four steps:

1. **Install the Vert.x GraphQL CLI.**

   ```shell
   npm install -g vertx-graphql-cli
   ```

2. **Create a Vert.x GraphQL service from a starter.**

   Get your Vert.x GraphQL service set up in a single command:

   ```sh
   # create a new Vert.x GraphQL service using the default starter
   vertx-graphql new my-vertx-graphql-service
   ```

3. **Start the site in `develop` mode.**

   Next, move into your new project directory and start it up:

   ```sh
   cd my-vertx-graphql-service/
   vertx-graphql develop
   ```

4. **Open the source code and start editing!**

   Your service is now running at `http://localhost:9000`. Open the `vertx-graphql` directory in your code editor of choice and edit `src/index.js`. Save your changes, and the service will update in real time!

## Manual Installation

```sh
npm install --save vertx-graphql
```

```sh
yarn add vertx-graphql
```

## Code of Conduct

Vert.x GraphQL is dedicated to building a welcoming, diverse, safe community. We expect everyone participating in the Vert.x GraphQL community to abide by our [**Code of Conduct**](./CODE_OF_CONCUCT.md). Please read it. Please follow it.

## How to Contribute

Whether you're helping us fix bugs, improve the docs, or spread the word, we'd love to have you as part of the Vert.x GraphQL community!

Check out our [**Contributing Guide**](./HOW_TO_CONTRIBUTE.md) for ideas on contributing and setup steps for getting our repositories up and running on your local machine.

## License

Licensed under the [Apache 2.0](./LICENSE).
