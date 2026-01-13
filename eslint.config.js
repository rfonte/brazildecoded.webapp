module.exports = [
  {
    files: ["src/assets/js/**/*.js"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "script",
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    rules: {
      "no-var": "off",
      "prefer-const": "off",
      "no-unused-vars": ["warn", { args: "none" }],
    },
  },
];
