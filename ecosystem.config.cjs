// PM2 process file: `pm2 start ecosystem.config.cjs && pm2 save`
module.exports = {
  apps: [
    {
      name: "avrix-web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: __dirname,
      env: { NODE_ENV: "production" },
      max_memory_restart: "800M",
      time: true,
    },
    {
      name: "avrix-worker",
      script: "node_modules/tsx/dist/cli.mjs",
      args: "worker/index.ts",
      cwd: __dirname,
      env: { NODE_ENV: "production" },
      max_memory_restart: "400M",
      kill_timeout: 5000,
      time: true,
    },
  ],
};
