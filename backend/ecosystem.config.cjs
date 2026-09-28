module.exports = {
  apps: [{
    name: "b2b-backend",
    script: "./dist/index.js",
    instances: "max",
    exec_mode: "cluster",
    env_production: { NODE_ENV: "production" }
  }]
}
