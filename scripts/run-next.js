const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const certPath = path.resolve('.certs/corporate-root-ca.pem');
const nextBin = require.resolve('next/dist/bin/next');
const args = process.argv.slice(2);
const env = { ...process.env };

if (fs.existsSync(certPath)) {
  env.NODE_EXTRA_CA_CERTS = certPath;
}

const child = spawn(process.execPath, [nextBin, ...args], {
  stdio: 'inherit',
  env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});
