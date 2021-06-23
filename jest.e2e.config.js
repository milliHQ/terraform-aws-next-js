const mainConfig = require('./jest.config');

module.exports = {
  ...mainConfig,
  // We only run e2e tests here
  // For unit tests see jest.config.js
  testMatch: [
    '<rootDir>/test/**/__tests__/**/*.[jt]s?(x)',
    '<rootDir>/test/**/?(*.)+(spec|test).[jt]s?(x)',
  ],
};
