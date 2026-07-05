const { spawn } = require('child_process');
const p = spawn('npx.cmd', ['prisma', 'migrate', 'dev', '--name', 'phase-20-indexes', '--skip-seed'], { shell: true });

p.stdout.on('data', (d) => {
  const str = d.toString();
  process.stdout.write(str);
  if (str.includes('We need to reset') || str.includes('this will fail') || str.includes('Yes,') || str.includes('?')) {
    p.stdin.write('y\n');
  }
});

p.stderr.on('data', (d) => {
  process.stderr.write(d.toString());
});

p.on('close', (code) => {
  process.exit(code);
});
