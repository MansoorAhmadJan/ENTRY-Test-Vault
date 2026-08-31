```js
// ESLint flat config (ESLint 9+).

import js from "@eslint/js";

const browserGlobals = {
  window: "readonly",
  document: "readonly",
  navigator: "readonly",
  location: "readonly",
  localStorage: "readonly",
  sessionStorage: "readonly",
  caches: "readonly",
  fetch: "readonly",
  console: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  setInterval: "readonly",
  clearInterval: "readonly",
  requestAnimationFrame: "readonly",
  cancelAnimationFrame: "readonly",
  CustomEvent: "readonly",
  Event: "readonly",
  performance: "readonly",
  MutationObserver: "readonly",
  ResizeObserver: "readonly",
  IntersectionObserver: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
  Blob: "readonly",
  FileReader: "readonly",
  AbortController: "readonly",
  App: "writable",
};

const serviceWorkerGlobals = {
  self: "readonly",
  caches: "readonly",
  fetch: "readonly",
  skipWaiting: "readonly",
  clients: "readonly",
  Response: "readonly",
  module: "readonly",
};

export default [
  js.configs.recommended,

  {
    files: ["dashboard/js/**/*.js", "js/**/*.js", "data/vault-data.js"],

    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "script",
      globals: browserGlobals,
    },

    rules: {
      "no-unused-vars": [
        "warn",
        {
          args: "none",
          caughtErrors: "none",
          varsIgnorePattern: "^_",
        },
      ],

      "no-undef": "error",

      eqeqeq: ["warn", "smart"],

      "no-console": "off",

      "no-empty": [
        "warn",
        {
          allowEmptyCatch: true,
        },
      ],
    },
  },

  {
    files: ["tests/**/*.mjs"],

    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      globals: {
        ...browserGlobals,
        process: "readonly",
      },
    },
  },

  {
    files: ["dashboard/sw.js", "sw.js"],

    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "script",
      globals: serviceWorkerGlobals,
    },
  },

  {
    files: ["scripts/**/*.mjs", "eslint.config.mjs"],

    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",

      globals: {
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        fetch: "readonly",
        __dirname: "readonly",
      },
    },
  },

  {
    ignores: ["dist/**", "node_modules/**", "data/vault-data.js"],
  },
];
```
