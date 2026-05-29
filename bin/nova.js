#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const tsxPath = path.join(__dirname, '..', 'node_modules', '.bin', 'tsx');
const indexPath = path.join(__dirname, '..', 'src', 'index.ts');

const child = spawn(tsxPath, [indexPath, ...process.argv.slice(2)], {
  stdio: 'inherit'
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
