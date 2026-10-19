// backend/jest.config.js
//
// Two runs, kept apart on purpose:
//
//   unit         - schema, validators and services. Nothing here touches a
//                  database, so it answers in seconds on any machine.
//   integration  - the supertest suites that need the in-memory MongoDB
//                  started by tests/setup.js.
//
// `npm test` still runs both, exactly as before.

const nodeEnvironment = {
  testEnvironment: 'node',
};

module.exports = {
  projects: [
    {
      ...nodeEnvironment,
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/**/*.unit.test.js'],
    },
    {
      ...nodeEnvironment,
      displayName: 'integration',
      setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
      testMatch: ['<rootDir>/tests/**/*.test.js'],
      testPathIgnorePatterns: ['/node_modules/', '\\.unit\\.test\\.js$'],
    },
  ],
};
