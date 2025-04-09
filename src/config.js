// Configuração centralizada da aplicação
export const config = {
  // Configurações do servidor
  PORT: process.env.PORT || 3005,
  NODE_ENV: 'development',
  APP_HOST: process.env.HOST || '0.0.0.0',

  // Configurações do Zabbix
  ZABBIX_URL: process.env.ZABBIX_URL || 'http://10.0.0.11/api_jsonrpc.php',
  ZABBIX_USER: process.env.ZABBIX_USER || 'Admin',
  ZABBIX_PASS: process.env.ZABBIX_PASS || 'zabbix',
  
  // Configurações do WhatsApp
  WPP_URL: process.env.WPP_URL || 'http://10.0.0.11:21465',
  WPP_SECRET_KEY: process.env.WPP_SECRET_KEY || 'My-Secret-Key',
  WPP_SESSION: process.env.WPP_SESSION || 'zabbix-session',

  // Grupos do WhatsApp
  WHATSAPP_GROUPS: {
    CRITICO: ['5511999999999@g.us'],
    ALERTA: ['5511988888888@g.us'],
    INFO: ['5511977777777@g.us']
  },

  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
};

export default config; 