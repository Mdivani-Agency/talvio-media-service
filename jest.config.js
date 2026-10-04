module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.jsx?$': ['ts-jest', { tsconfig: { allowJs: true, esModuleInterop: true } }],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@middy|@silverbucket|@fluent|ajv-|fluent-))',
  ],
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.{js,ts}', '!src/repositories/*.{js,ts}'],
  collectCoverage: true,
  testTimeout: 60000,
  moduleDirectories: ['node_modules', 'src', 'test'],
  setupFiles: ['<rootDir>/.jest/setEnvVars.ts'],
  testMatch: ['<rootDir>/src/**/*.spec.{ts,js}'],
  modulePaths: ['<rootDir>/test/'],
  moduleNameMapper: {
    '@lib/(.*)': '<rootDir>/src/lib/$1',
  },
  coverageThreshold: {
    global: {
      statements: 40,
    },
  },
};
