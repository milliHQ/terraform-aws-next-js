# How to release a new version of [`@dealmore/next-tf`](https://www.npmjs.com/package/@dealmore/next-tf)

The `@dealmore/next-tf` is a direct fork from the `@vercel/next` package with some small additions we need for Terraform-Next.js.

## 1. Clone the Vercel fork

Clone the Vercel fork from [`dealmore/vercel`](https://github.com/dealmore/vercel) and checkout the `master` branch.

Then bring the master branch up-to-date with the `vercel/vercel` `master` branch.

Finally merge the `upstream/master` branch into the local `master` branch.

```sh
# Initial setup
git clone git clone git@github.com:dealmore/vercel.git
git remote add upstream git@github.com:vercel/vercel.git

# Bring master up-to-date with upstream/master
git checkout master
git pull upstream master
```

## 2. Merge the current master into the `next-tf` branch

```sh
git checkout next-tf
git merge master
```

Resolve merge conflicts as needed.

## 3. Prepare the build

```sh
# Install dependencies
yarn

# Build now-build-utils
cd packages/now-build-utils
yarn build
```

## 4. Build & publish the `@dealmore/next-tf` package

```sh
cd packages/now-next
npm publish --access public
```
