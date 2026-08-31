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
  {
    ignores: ["node_modules/**", "dist/**", "data/vault-data.js"],
  },

  js.configs.recommended,

  {
    files: ["js/**/*.js"],

    languageOptions: {
      ecmaVersion: "latest",
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
      "no-empty": ["warn", { allowEmptyCatch: true }],
    },
  },

  {
    files: ["tests/**/*.mjs"],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...browserGlobals,
        process: "readonly",
      },
    },
  },

  {
    files: ["scripts/**/*.mjs", "eslint.config.mjs"],

    languageOptions: {
      ecmaVersion: "latest",
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
    files: ["sw.js"],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: serviceWorkerGlobals,
    },
  },
];
