# Development

This is a small guide to get started with development of this module.
From time to time I come back to it as well when I forgot something.

## Testing

For local testing make sure that you have the following tools installed on your machine:

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/) (Already included in Docker for Mac & Windows)
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)

We have 2 kinds of tests:

- **Unit tests**

  Unit tests have mostly no external requirements.
  However some of them (e.g. `deploy-trigger`) need a connection to external services like S3 which is emulated locally by docker containers.
  The unit tests are located at their corresponding packages.

  Before executing any unit tests, you should make sure to start the services from the workspace root:

  ```sh
  docker-compose up -d
  ```

- **e2e tests**

  The e2e tests ensure that real Next.js are bundled and deployed in the right way.
  To do this we have fixture apps in `/test/fixtures/` directory that are builded and then deployed locally in Docker containers via AWS SAM CLI.
  Running e2e tests consist of two steps:

  1. Building the fixtures with `terraform-next-build`:

     ```sh
     yarn test:e2e:prepare
     ```

  2. Run the actual tests

     ```sh
     yarn test:e2e
     ```
