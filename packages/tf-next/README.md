# Terraform Next Build

Command-line interface (CLI) tool for [Terraform Next.js module for AWS](https://github.com/milliHQ/terraform-aws-next-js).  
It is used for [building](#build) Next.js apps, deployment and management of deployments.

## Getting Started

This covers only the CLI part of the tool, for a full step-by-step tutorial please see our [examples](https://github.com/milliHQ/terraform-aws-next-js#examples).

1. Install the CLI tool:

   ```sh
   npm i -g tf-next
   ```

2. Build the project:

   ```sh
   tf-next build
   ```

3. Deploy the app:

   ```sh
   tf-next deploy --endpoint https://<api-id>.execute-api.<region>.amazonaws.com

   > ✅ Upload complete.
   > ✅ Deployment complete.
   > Available at: https://1e02d46975338b63651b8587ea6a8475.example.com
   ```

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

To publish an previously built Next.js app to the system, run `tf-next deploy` from the same directory where the build command was executed from.

#### Basic Usage

```sh
tf-next deploy --endpoint <api-endpoint>
```

#### Global Options

The following options can be passed when using the `tf-next deploy` command:

- `--endpoint`
- `--profile`

## License

Apache-2.0 - see [LICENSE](./LICENSE) for details.
