/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");

/**
 * TypeScript при module=CommonJS пишет `.js`.
 * Но чтобы Node (и TS) корректно воспринимали require-выход как CJS при `"type":"module"`,
 * мы переименовываем entrypoint в `.cjs`.
 */
const distDir = path.join(__dirname, "..", "dist-cjs");
const from = path.join(distDir, "index.js");
const to = path.join(distDir, "index.cjs");
const pkg = path.join(distDir, "package.json");

if (!fs.existsSync(distDir)) {
  console.error("dist-cjs not found:", distDir);
  process.exit(1);
}

if (!fs.existsSync(from)) {
  console.error("index.js not found:", from);
  process.exit(1);
}

fs.renameSync(from, to);
console.log("renamed", from, "->", to);

// Чтобы все `.js` файлы в dist-cjs воспринимались как CommonJS,
// несмотря на `"type":"module"` в корневом package.json.
fs.writeFileSync(pkg, JSON.stringify({ type: "commonjs" }, null, 2) + "\n");
console.log("wrote", pkg);

