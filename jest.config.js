module.exports = {
  transform: {
    '^.+\\.tsx?$': '<rootDir>/node_modules/ts-jest/preprocessor.js',
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec|jest))\\.(tsx?)$',
  testPathIgnorePatterns: ['<rootDir>/src/environments/', '<rootDir>/src/shared/'],
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
  // testResultsProcessor: 'jest-junit',
  skipNodeResolution: true,
  globals: {
    'ts-jest': {
      skipBabel: true,
    },
  },
  unmockedModulePathPatterns: [],
  // setupTestFrameworkScriptFile: '<rootDir>/src/test/setupJest.ts',
  mapCoverage: true,
}
