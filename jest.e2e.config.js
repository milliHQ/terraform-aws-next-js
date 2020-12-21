const mainConfig = require('./jest.config');

module.exports = {
  ...mainConfig,
  // We only run e2e tests here
  // For unit tests see jest.config.js
  testMatch: [
    '<rootDir>/test/**/__tests__/**/*.[jt]s?(x)',
    '<rootDir>/test/**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  // We use an increased timeout here because in the worst case
  // AWS SAM needs to download a docker image before the test can run
  testTimeout: 60000,
};
