/** @type {import('ts-jest').InitialOptionsTsJest} */
module.exports = {
  projects: ['<rootDir>/packages/*'],
  globalSetup: '<rootDir>/test/jest.setup.ts',
};
