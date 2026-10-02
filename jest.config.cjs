module.exports = {
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)',
  ],
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(j|t)s?$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          moduleResolution: 'node10',
          allowJs: true,
          rootDir: './',
          strict: false,
          noImplicitAny: false,
          strictNullChecks: false,
        },
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!\\.pnpm/(?:lit@|lit-html@|lit-element@|@lit\\+)|lit|lit-html|lit-element|@lit)',
  ],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/src/test/__mocks__/styleMock.js',
  },
}
