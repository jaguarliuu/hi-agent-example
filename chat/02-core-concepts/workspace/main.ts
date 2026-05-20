import { spawn } from 'node:child_process';

const child = spawn('npm', ['run', 'chat'], {
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});

child.on('error', (error) => {
  console.error(`Failed to start chat: ${error.message}`);
  process.exitCode = 1;
});
