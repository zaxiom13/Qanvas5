#!/usr/bin/env node
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const appEntry = '.';
const projectRoot = path.join(__dirname, '..');
const explicitRuntime = (process.env.QANVAS5_DESKTOP_RUNTIME || '').trim().toLowerCase();
const electrobunBin = path.join(
  projectRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'electrobun.cmd' : 'electrobun'
);
const electronBin = path.join(
  projectRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'electron.cmd' : 'electron'
);
const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function runCommand(command, args) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    cwd: projectRoot,
    env: {
      ...process.env,
      QANVAS5_SOURCE_ROOT: process.env.QANVAS5_SOURCE_ROOT || projectRoot
    }
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });

  child.on('error', (error) => {
    console.error(`[desktop] Failed to launch '${command}':`, error.message);
    process.exit(1);
  });
}

function buildFrontend() {
  const result = spawnSync(npmBin, ['run', 'build:web'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    cwd: projectRoot,
    env: {
      ...process.env,
      QANVAS5_SOURCE_ROOT: process.env.QANVAS5_SOURCE_ROOT || projectRoot
    }
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function hasLocalElectrobun() {
  return fs.existsSync(electrobunBin);
}

function hasLocalElectron() {
  return fs.existsSync(electronBin);
}

function launchElectron() {
  if (!hasLocalElectron()) {
    console.error('[desktop] Electron is not installed in this project.');
    process.exit(1);
  }
  runCommand(electronBin, [appEntry]);
}

function launchElectrobun() {
  if (!hasLocalElectrobun()) {
    console.error('[desktop] Electrobun is not installed in this project.');
    process.exit(1);
  }
  runCommand(electrobunBin, ['dev']);
}

async function main() {
  buildFrontend();

  if (explicitRuntime === 'electron') {
    launchElectron();
    return;
  }

  if (explicitRuntime === 'electrobun') {
    launchElectrobun();
    return;
  }

  if (hasLocalElectrobun()) {
    console.log('[desktop] local Electrobun detected; launching with Electrobun dev (override with QANVAS5_DESKTOP_RUNTIME=electron).');
    launchElectrobun();
    return;
  }

  console.log('[desktop] Electrobun is not installed in this project; falling back to Electron.');
  launchElectron();
}

main().catch((error) => {
  console.error('[desktop] Unexpected startup error:', error);
  process.exit(1);
});
