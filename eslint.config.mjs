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
  App: "writable"
};

const nodeGlobals = {
  process: "readonly",
  console: "readonly",
  Buffer: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  setInterval: "readonly",
  clearInterval: "readonly",
  fetch: "readonly"
};

const serviceWorkerGlobals = {
  self: "readonly",
  caches: "readonly",
  fetch: "readonly",
  skipWaiting: "readonly",
  clients: "readonly",
  Response: "readonly",
  module: "readonly"
};

export default [
  {
    ignores: ["node_modules/**", "dist/**"]
  },

  js.configs.recommended,

  {
    files: ["js/**/*.js", "data/vault-data.js"],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: browserGlobals
    },

    rules: {
      "no-unused-vars": "off",
      "no-undef": "error",
      "no-console": "off"
    }
  },

  {
    files: ["tests/**/*.mjs"],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...browserGlobals,
        ...nodeGlobals
      }
    },

    rules: {
      "no-undef": "error",
      "no-unused-vars": "off"
    }
  },

  {
    files: ["scripts/**/*.mjs"],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: nodeGlobals
    },

    rules: {
      "no-undef": "error",
      "no-unused-vars": "off"
    }
  },

  {
    files: ["sw.js"],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: serviceWorkerGlobals
    }
  }
];
