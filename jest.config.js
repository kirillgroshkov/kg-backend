module.exports = {
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec|jest))\\.(tsx?)$',
  testPathIgnorePatterns: ['<rootDir>/src/environment/'],
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
  skipNodeResolution: true,
  moduleNameMapper: {
    // should match aliases from tsconfig.json
    // as explained here: https://alexjoverm.github.io/2017/10/07/Enhance-Jest-configuration-with-Module-Aliases/
    '@src/(.*)$': '<rootDir>/src/$1',
  },
  globals: {
    'ts-jest': {
      // skipBabel: false,
    },
  },
  unmockedModulePathPatterns: [],
  setupTestFrameworkScriptFile: '<rootDir>/src/test/setupJest.ts',
}
