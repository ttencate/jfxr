module.exports = {
  extends: 'eslint:recommended',
  parserOptions: {
    ecmaVersion: '2015',
    sourceType: 'module',
  },
  env: {
    // This is needed to access typed arrays (Float32Array and such). These
    // have much broader support than just ES2015, but eslint doesn't know
    // that.
    es6: true,
  },
  rules: {
    // Allow unused function arguments if they match this pattern. This is so
    // that we can clearly state that the function receives this argument but
    // chooses to ignore it.
    'no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^unused_',
      },
    ],
  },
};
