/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  coverageThreshold: {
    global: { statements: 80, branches: 75, functions: 80, lines: 80 }
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/types/**', '!src/utils/prisma.ts'],
};
