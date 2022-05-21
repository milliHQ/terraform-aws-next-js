# Terraform Next Build

The command-line interface (CLI) tool [Terraform Next.js module for AWS](https://github.com/milliHQ/terraform-aws-next-js).
It is used for [building](#build) Next.js apps, deployment and management of deployments.

## Commands

### Build

#### Basic Usage

To build a Next.js app, run `tf-next build` from the directory where your `next.config.js` or `package.json` is located.
The app is then checked out into a temporary folder and build from there.
Once the build process is finished, a new folder `.next-tf` is added to your current working directory.
The `.next-tf` folder contains a deployment package that can be used together with the [deploy command](#deploy) to deploy your application.

```sh
tf-next build
```

#### Extended Usage

The `--skipDownload` flag can be used to prevent the checkout into a temporary folder (builds in the current working directory instead):

```sh
tf-next build --skipDownload
```

#### Global Options

The following options can be passed when using the `tf-next build` command:

- `--skipDownload`

### Deploy

#### Basic Usage

## Getting Started

Add the CLI tool to your existing Next.js app:

```sh
npm i --save-dev tf-next  # npm or
yarn add -D tf-next       # yarn
```

Then extend the `package.json` of your project with the `tf-next` script:

```diff
{
  ...
  "scripts": {
    "dev": "next",
    "build": "next build",
    "start": "next start",
+   "tf-next": "tf-next build"
  }
  ...
}
```

Then build the project by running the following command:

```sh
npm run tf-next  # npm or
yarn tf-next     # yarn
```

### Commands

```sh
tf-next build [--skipDownload]  # Builds the Next.js app
```

## License

Apache-2.0 - see [LICENSE](./LICENSE) for details.
