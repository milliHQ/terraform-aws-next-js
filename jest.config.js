module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: './',
  globalSetup: '<rootDir>/test/jest.setup.ts',
  // Exclude tests that don't run
  testPathIgnorePatterns: ['<rootDir>/packages/runtime/test/test.js'],
};
