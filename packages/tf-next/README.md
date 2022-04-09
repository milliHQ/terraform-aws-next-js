# Terraform Next Build

CLI build tool for [Terraform Next.js module for AWS](https://github.com/milliHQ/terraform-aws-next-js).

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
