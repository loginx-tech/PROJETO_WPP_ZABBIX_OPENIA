module.exports = {
  apps: [{
    name: "zabbix-whatsapp-ia",
    script: "npm",
    args: "run prod",
    cwd: "/opt/PROJETO_WPP_ZABBIX_OPENIA",
    watch: false,
    env: {
      NODE_ENV: "production",
      PORT: 3001
    },
    instances: 1,
    autorestart: true,
    max_memory_restart: "1G",
    error_file: "logs/err.log",
    out_file: "logs/out.log",
    time: true
  }]
}; 