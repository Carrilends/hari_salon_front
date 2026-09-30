/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/tests/**/*.spec.(ts|js)'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/tests/browser-compat/'],
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
    // Con `testEnvironment: jsdom`, Jest resuelve la condición de exportación
    // `browser`, y la build de navegador de test-utils espera un `Vue` global
    // («ReferenceError: Vue is not defined»). Se apunta a la build CommonJS en
    // vez de tocar `customExportConditions`, que cambiaría la resolución de
    // TODAS las dependencias (axios entre ellas) para arreglar solo esta.
    '^@vue/test-utils$':
      '<rootDir>/node_modules/@vue/test-utils/dist/vue-test-utils.cjs.js',
    // Debe ir ANTES del alias genérico `^src/(.*)$`: el módulo real lee
    // `import.meta.env`, que ts-jest no puede compilar a CommonJS.
    '^(?:src/composables/seo|\\.)/site-url$': '<rootDir>/tests/siteUrlMock.ts',
    '^(?:src/api|\\.)/ws-url$': '<rootDir>/tests/wsUrlMock.ts',
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
