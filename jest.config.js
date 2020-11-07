module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: './',
  globalSetup: '<rootDir>/test/jest.setup.ts',
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json',
    },
  },
  // By default we only run tests in the packages subfolders
  // For e2e tests see the jest.e2e.config.js file
  testMatch: [
    '<rootDir>/packages/**/__tests__/**/*.[jt]s?(x)',
    '<rootDir>/packages/**/?(*.)+(spec|test).[jt]s?(x)',
  ],
};
