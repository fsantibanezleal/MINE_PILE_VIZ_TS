/**
 * cPanel Node.js App entry point.
 *
 * cPanel's Phusion Passenger for Node.js sets the PORT environment variable.
 * Next.js `next start` reads PORT automatically.
 * This file simply invokes `next start` programmatically.
 */
const { execSync } = require('child_process');
const port = process.env.PORT || 3000;

process.env.PORT = String(port);
require('next/dist/server/lib/start-server');

// Fallback: run next start as child process
const { spawn } = require('child_process');
const next = spawn('npx', ['next', 'start', '-p', String(port)], {
  stdio: 'inherit',
  env: { ...process.env, PORT: String(port) },
});
next.on('close', (code) => process.exit(code));
