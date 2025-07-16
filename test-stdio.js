import { spawn } from 'child_process';

console.log('Testing stdio mode...');

const child = spawn('node', ['dist/index.js', '--stdio'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

child.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});

child.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});

setTimeout(() => {
  child.kill();
  console.log('Test complete');
}, 2000);
