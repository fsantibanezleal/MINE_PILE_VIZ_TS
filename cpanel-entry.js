/**
 * cPanel Node.js App entry point.
 *
 * Before first run, execute: bash scripts/cpanel-build.sh
 * This fixes the symlinked node_modules and runs next build.
 *
 * Passenger sets PORT automatically.
 */
const { spawn } = require("child_process");

const port = process.env.PORT || 3000;

const server = spawn("npx", ["next", "start", "-p", String(port)], {
  stdio: "inherit",
  env: { ...process.env, PORT: String(port) },
});

server.on("close", (code) => process.exit(code));
