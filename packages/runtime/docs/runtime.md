# Runtime development sheet

From: 20. November 2021

This is a description how the runtime internally works.

## Next.js milestones

### [10.0.9-canary.4](https://github.com/vercel/next.js/releases/tag/v10.0.9-canary.4) - 09 Mar 2021

Beginning with this version the builder no longer sets the environment variable `NEXT_PRIVATE_TARGET=experimental-serverless-trace` and uses the default `target: server`.

### [10.0.8-canary.15](https://github.com/vercel/next.js/releases/tag/v10.0.8-canary.15) - 03 Mar 2021

Beginning with this version Next.js uses the `target: server` by default instead of `target: experimental-serverless-trace`.  
This can be overridden by setting the environment variable `NEXT_PRIVATE_TARGET=experimental-serverless-trace` in newer versions of Next.js.  
The path of the server output folder also changed from `.serverless` to `.server` in the build output.

### [9.0.4-canary.1](https://github.com/vercel/next.js/releases/tag/v9.0.4-canary.1) - 06 Aug 2019

Beginning with with this version, the builder uses `target: experimental-serverless-trace` instead of `target: serverless` when building Next.js.

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
