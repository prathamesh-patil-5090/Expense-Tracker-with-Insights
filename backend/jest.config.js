export default {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    moduleFileExtensions: ['ts', 'js', 'json'],
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', { useESM: true }],
    },
    globals: {
        'ts-jest': {
            useESM: true,
            tsconfig: 'tsconfig.json',
        },
    },
    extensionsToTreatAsEsm: ['.ts'],
    testMatch: ['**/src/tests/**/*.test.ts'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
};
