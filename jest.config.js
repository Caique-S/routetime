const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js', '**/*.test.ts', '**/*.spec.js', '**/*.spec.ts'],
}

module.exports = createJestConfig(customJestConfig)