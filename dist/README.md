## Build Artifacts Explained (`dist/` directory)

This package provides multiple builds to support various JavaScript environments and module systems:

  * **`dist/lea-wallet.node.mjs`**

      * **Environment:** Node.js
      * **Format:** ES Module (ESM)
      * **Usage:** For modern Node.js applications using `import` syntax (e.g., projects with `"type": "module"` in `package.json`).

  * **`dist/lea-wallet.node.cjs`**

      * **Environment:** Node.js
      * **Format:** CommonJS (CJS)
      * **Usage:** For Node.js applications using the traditional `require()` syntax. Provides backward compatibility.

  * **`dist/lea-wallet.web.js`**

      * **Environment:** Browser
      * **Format:** ES Module (ESM)
      * **Usage:** For use in modern browsers with `<script type="module">` or when using bundlers (Webpack, Rollup, Vite, Parcel, etc.) that support ES modules. Recommended for most front-end development.

  * **`dist/lea-wallet.web.min.js`**

      * **Environment:** Browser
      * **Format:** Immediately Invoked Function Expression (IIFE), Minified
      * **Usage:** For direct inclusion in HTML using `<script src="...">`. Does not require a module system or bundler. Exports functionality to the global variable `Lea`. Minified for production use.
