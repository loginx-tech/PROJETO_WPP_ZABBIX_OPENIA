module.exports = {
  apps: [{
    name: "zabbix-whatsapp-ia",
    script: "node",
    args: "start-prod.js",
    cwd: "/opt/PROJETO_WPP_ZABBIX_OPENIA",
    watch: false,
    env: {
      NODE_ENV: "production",
      PORT: 3001,
      ZABBIX_URL: "http://10.0.0.11/api_jsonrpc.php",
      ZABBIX_USER: "Admin",
      ZABBIX_PASSWORD: "540298cb",
      OPENAI_API_KEY: "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",
      WPP_URL: "http://10.0.0.11:21465",
      WPP_SECRET_KEY: "ERIONETOKEN@2025",
      AUTH_USERNAME: "admin",
      AUTH_PASSWORD: "JasonBourne@2025"
    },
    instances: 1,
    autorestart: true,
    max_memory_restart: "1G",
    error_file: "logs/err.log",
    out_file: "logs/out.log",
    time: true
  }]
}; 