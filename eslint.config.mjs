import js from "@eslint/js";

export default [
  {
    ignores: ["node_modules/**", "dist/**"],
  },

  js.configs.recommended,

  {
    files: ["js/**/*.js"],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
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
      },
      parserOptions: {
        ecmaVersion: "latest",
      },
    },

    rules: {
      "no-unused-vars": "off",
      "no-undef": "error",
      "no-console": "off",
    },
  },

  {
    files: ["tests/**/*.mjs", "scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        window: "readonly",
        document: "readonly",
      },
    },
  },

  {
    files: ["sw.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        self: "readonly",
        caches: "readonly",
        fetch: "readonly",
        skipWaiting: "readonly",
        clients: "readonly",
        Response: "readonly",
        module: "readonly",
      },
    },
  },
];
