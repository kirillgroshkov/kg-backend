module.exports = {
  transform: {
    '^.+\\.tsx?$': '<rootDir>/node_modules/ts-jest/preprocessor.js',
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec|jest))\\.(tsx?)$',
  testPathIgnorePatterns: ['<rootDir>/src/environment/'],
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
  // testResultsProcessor: 'jest-junit',
  skipNodeResolution: true,
  moduleNameMapper: {
    // should match aliases from tsconfig.json
    // as explained here: https://alexjoverm.github.io/2017/10/07/Enhance-Jest-configuration-with-Module-Aliases/
    '@src/(.*)$': '<rootDir>/src/$1',
  },
  globals: {
    'ts-jest': {
      skipBabel: true,
    },
  },
  unmockedModulePathPatterns: [],
  setupTestFrameworkScriptFile: '<rootDir>/src/test/setupJest.ts',
}
