# AWS Next.js Terraform module

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
