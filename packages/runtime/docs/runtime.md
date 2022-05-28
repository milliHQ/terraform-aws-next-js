# Runtime development sheet

From: 20. November 2021

This is a description how the runtime internally works.

## Next.js milestones

This contains a list of milestones where functionality in Next.js was changed that affects the runtime.

### [11.1.3-canary.96](https://github.com/vercel/next.js/releases/tag/v11.1.3-canary.96) - 23 Oct 2021

With this release a new manifest (`*.nft.json`) was introduced, so that each SSR page also contains the files it requires from third-party libraries.
This basically runs a version of [`@vercel/nft`](https://www.npmjs.com/package/@vercel/nft) in Next.js instead of this builder.
Therefore no file-tracing is required after this release.

### [10.0.9-canary.4](https://github.com/vercel/next.js/releases/tag/v10.0.9-canary.4) - 09 Mar 2021

Beginning with this version the builder no longer sets the environment variable `NEXT_PRIVATE_TARGET=experimental-serverless-trace` and uses the default `target: server`.

### [10.0.8-canary.15](https://github.com/vercel/next.js/releases/tag/v10.0.8-canary.15) - 03 Mar 2021

Beginning with this version Next.js uses the `target: server` by default instead of `target: experimental-serverless-trace`.  
This can be overridden by setting the environment variable `NEXT_PRIVATE_TARGET=experimental-serverless-trace` in newer versions of Next.js.  
The path of the server output folder also changed from `.serverless` to `.server` in the build output.

### [9.0.4-canary.1](https://github.com/vercel/next.js/releases/tag/v9.0.4-canary.1) - 06 Aug 2019

Beginning with with this version, the builder uses `target: experimental-serverless-trace` instead of `target: serverless` when building Next.js.
This means that instead of including the whole content of `node-modules` in the Lambda, only files that are actually used in code are included in the Lambda package (File-tracing).
This is done via the [`@vercel/nft`](https://www.npmjs.com/package/@vercel/nft) package

### [7.0.3-alpha.0](https://github.com/vercel/next.js/releases/tag/v7.0.3-alpha.0) - 30 Oct 2018

All versions prior to this released are considered as legacy versions by the build tool.
Legacy means that no file-tracing is active and everything from the `node_modules` is included in the Lambda.

## Procedure

### 1. Download of files

All source files that are required for the build, are downloaded to a temporary folder before the actual build happens.
Some third-party packages try to detect a Vercel-like build environment like this, so we need to make sure that the following environment variables are set before staring the build:

```
NOW_BUILDER=1
VERCEL=1
```

Since the build script is commonly started from outside of the temporary download folder, we have to manually set the `INIT_CWD` environment variable to the temporary download folder.

### 2. Pre-Build

Before running the build, the `package.json` gets customized to ensure that the `next build` command is executed by the builder.
If the `build` script is not set, it gets overridden with `next build`.
When the `build` script is already set, then the `build` script is renamed and runs before the actual Next.js build.

It is then detecting if npm or yarn is used and runs the install command of the package manager that is used.

#### Create serverless `next.config.js`

> This step is only executed on Next.js versions `< 10.0.9-canary.4`.

To set the target option in the `next.config.js`, the original file (if exists) is renamed to `next.config.__vercel_builder_backup__.js`.
Then a new `next.config.js` is created with the following content:

```js
module.exports = function (...args) {
  let original = require('./next.config.__vercel_builder_backup__');

  const finalConfig = {};
  const target = { target: 'experimental-serverless-trace' };

  if (
    typeof original === 'function' &&
    original.constructor.name === 'AsyncFunction'
  ) {
    // AsyncFunctions will become promises
    original = original(...args);
  }

  if (original instanceof Promise) {
    // Special case for promises, as it's currently not supported
    // and will just error later on
    return original
      .then((orignalConfig) => Object.assign(finalConfig, orignalConfig))
      .then((config) => Object.assign(config, target));
  } else if (typeof original === 'function') {
    Object.assign(finalConfig, original(...args));
  } else if (typeof original === 'object') {
    Object.assign(finalConfig, original);
  }

  Object.assign(finalConfig, target);

  return finalConfig;
};
```

### 3. Build Next.js

Building Next.js is simply running `next build` which produces a bunch of files that are written to the `.next` folder.

The following files are then used in the further process:

- Routes manifest
- Images manifest
- prerender manifest  
  Prerendered routes emit a `.html` file but should not be treated as a static page.
  Lazily prerendered routes have a fallback `.html` file on newer Next.js versions so we need to also not treat it as a static page here.

### 4. Building Routes

The following things are extracted from the routes manifest:

- redirects
- rewrites
- dataroutes (available at `/_next/data`) for both dynamic SSG and SSP pages.
  - Can also have a nextLocale

### 5. Create image config

The image config is created from the Images manifest.

### 6. Build Lambdas

#### Important variables

- `pagesDir`  
  Path to the server (or serverless) directory inside the `.next folder`
- `pages`  
  Contains a list of all `.js` files exported in the `pagesDir`.  
  Has at least 1 entry (`_error.js`).
- `staticPageFiles`
  Container a list of all `.html` files exported in the `pagesDir`
- `staticPages`
- `dynamicPages`  
  Contains all SSR pages that have a dynamic pattern in its path (e.g. `[someId].js`)
- `pseudoLayers`
- `apiPseudoLayers`
- `nonLambdaSsgPages`
- `apiLambdaGroups`
- `pageLambdaGroups`

First the static output (prerendered HTML pages `.html`) is analyzed.
They are categorized into static routes (e.g. `/test`) and dynamic pages (`/[slug]`).

Then it is determined if the 404 page is static (prerendered) or dynamic (SSR).

Each static route from the prerender manifest is then checked if it can be added to `nonLambdaSsgPages`.

#### 6.x Tracing

> Tracing is only executed for Node.js versions `>9.0.4-canary.1`

Then the tracing is executed.

For this every page from `pages` is categorized into `apiPages` or `nonApiPages`.
Only pages that are not already in `nonLambdaSsgPages` are added to `nonApiPages`.

Then nft is executed for both the `apiPages` and `nonApiPages`.

From that the traced files are collected into `tracedFiles` and `apiTracedFiles`.
Then a pseudoLayer is created from `tracedFiles` and `apiTracedFiles`, which contain the dependencies of the pages and apiPages.

A pseudoLayer is an object that contains for each filePath the compressed buffer of the original file (PseudoFile) or the information about the symlink of the file (PseudoSymbolicLink).
The created pseudoLayers are then pushed to `pseudoLayers` and `apiPseudoLayers`

#### 6.x Creating serverless functions

- **Shared Lambdas**  
  Every page in `pages` (that is not `_app.js` or `_document.js`) is assigned to a LambdaGroup.
  If the page is already in `nonLambdaSsgPages` it is not added to the Lambda.
  A LambdaGroup is a collection of multiple pages or ApiPages that can be combined into a single Lambda (Which reduces the total number of Lambdas needed for serving the app.)
  A LambdaGroup has the name of the form `__NEXT_PAGE_LAMBDA_<GroupIndex>` for pages and `__NEXT_API_LAMBDA_<GroupIndex>` for apiPages.
  The aim is that each LambdaGroup stays below 50mb (Compressed code size limit from AWS Lambda), so when a LambdaGroup exceeds this limit, a new group is crated.

  For each page is then a new route is added to `dynamicPageLambdaRoutes`
