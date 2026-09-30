// Run "npm run dev" hidden via cmd.exe (works on Windows)
const { spawn } = require('child_process');

const CMD = process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe';
const child = spawn(CMD, ['/d', '/s', '/c', 'npm run dev'], {
  cwd: 'F:\\Applications\\Vendor-Portal\\BE',
  stdio: 'inherit',      // stream output to PM2 logs
  windowsHide: true,     // no visible window
  shell: false           // we're explicitly launching cmd.exe
});

child.on('exit', code => process.exit(code ?? 0));
child.on('error', err => { console.error(err); process.exit(1); });
