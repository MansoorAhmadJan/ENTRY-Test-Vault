// ESLint flat config (ESLint 9+).
//
// IMPORTANT: this codebase is NOT ES modules. Every file under js/ is a
// classic IIFE `(function (App) { ... })(window.App = window.App || {})`
// that runs as a plain global <script>, in the load order fixed by
// index.html. `sourceType` is therefore "script", not "module", and `App`
// is declared as a shared writable global rather than imported/exported.
// Do not "fix" this by switching sourceType to module — that would change
// how the app loads and contradicts docs/ARCHITECTURE.md.
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
  // Shared app namespace: every module writes to it, so it must be a
  // writable global rather than "readonly" or ESLint flags every module
  // boundary as a redeclaration.
  App: "writable",
};

const serviceWorkerGlobals = {
  self: "readonly",
  caches: "readonly",
  fetch: "readonly",
  skipWaiting: "readonly",
  clients: "readonly",
  Response: "readonly",
  module: "readonly", // only used in a `typeof module !== "undefined"` guard for testability — harmless in the browser
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
      "no-unused-vars": ["warn", { args: "none", varsIgnorePattern: "^_" }],
      "no-undef": "error",
      eqeqeq: ["warn", "smart"],
      "no-console": "off", // console.error/.warn are the app's logging layer today (see errorHandler.js)
      "no-empty": ["warn", { allowEmptyCatch: true }],
    },
  },
  {
    files: ["tests/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      globals: { ...browserGlobals, process: "readonly" },
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
