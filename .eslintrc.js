/* eslint-env node */
module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "airbnb-base",
    "airbnb-typescript/base",
    "plugin:prettier/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.eslint.json",
  },
  rules: {
    "prettier/prettier": "error",
    "no-continue": 0,
  },
  plugins: ["@typescript-eslint", "prettier"],
  root: true,
};
