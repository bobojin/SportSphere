import { spawn } from "node:child_process";

const processes = [
  spawn(process.execPath, ["server/index.js"], {
    stdio: "inherit",
    shell: false
  }),
  spawn("npx", ["vite", "--config", "client/vite.config.js"], {
    stdio: "inherit",
    shell: true
  })
];

const shutdown = () => {
  for (const child of processes) {
    if (!child.killed) {
      child.kill();
    }
  }
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

for (const child of processes) {
  child.on("exit", (code) => {
    if (code && code !== 0) {
      shutdown();
    }
  });
}
