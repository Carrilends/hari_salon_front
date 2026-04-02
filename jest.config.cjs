/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/tests/**/*.spec.(ts|js)'],
  moduleFileExtensions: ['ts', 'js', 'json', 'vue'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  transform: {
    '^.+\\.vue$': '@vue/vue3-jest',
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '\\.(css|scss|sass)$': '<rootDir>/tests/styleMock.js',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,js,vue}',
    '!src/**/index.{ts,js}',
    '!src/**/store-flag.d.ts',
    '!src/**/apiTypes.d.ts',
  ],
};

