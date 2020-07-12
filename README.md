# AWS Next.js Terraform module

## Usage

### Add to your Next.js project

First add our custom builder to your Next.js project. It uses the same builder under the hood as Vercel does:

```sh
npm i -D @dealmore/terraform-next-build     # npm or
yarn add -D @dealmore/terraform-next-build  # yarn
```

Then you should add a new script to your package.json (Make sure it is not named `build`):

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

`tf-next build` runs in a temporary directory and puts its output in a `.next-tf` directory in the same directory where your `package.json` is.
The output in the `.next-tf` directory is all what the Terraform module needs in the next step.

### Setup the Next.js Terraform module

TODO

### `.terraformignore`

When using this module together with [Terraform Cloud](https://www.terraform.io/) make sure that you also upload the build output from the [`terraform-next-build`](https://www.npmjs.com/package/@dealmore/terraform-next-build) task.
You can create a `.terraformignore` in the root of your project and add the following line:

```diff
+  !**/.next-tf/**
```

## Known issues

Under the hood this module uses a lot of [Vercel's](https://github.com/vercel/vercel/) build pipeline.
So issues that exist on Vercel are likely to occur on this project too.

- Missing monorepo support ([#3547](https://github.com/vercel/vercel/issues/3547))

  **Workaround (for yarn workspaces):**

  In the package, where Next.js is installed, add the following code to the `package.json`:

  ```json
  "workspaces": {
    "nohoist": [
      "**"
    ]
  },
  ```

  This ensures that all packages are installed to a `node_module` directory on the same level as the `package.json`.

## License

Apache-2.0 - see [LICENSE](./LICENSE) for details.
