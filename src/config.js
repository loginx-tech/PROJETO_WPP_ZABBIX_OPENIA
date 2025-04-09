import dotenv from 'dotenv';
dotenv.config();

// Configuração centralizada da aplicação
const config = {
  // Configurações do servidor
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  APP_HOST: process.env.HOST || '0.0.0.0',

  // Configurações do Zabbix
  ZABBIX_URL: process.env.ZABBIX_URL || 'http://localhost/zabbix/api_jsonrpc.php',
  ZABBIX_USER: process.env.ZABBIX_USER || 'Admin',
  ZABBIX_PASSWORD: process.env.ZABBIX_PASSWORD || 'zabbix',
  
  // Configurações do WhatsApp
  WPP_URL: process.env.WPP_URL || 'http://localhost:3000',
  WPP_SECRET_KEY: process.env.WPP_SECRET_KEY || 'your-secret-key',
  WPP_SESSION: process.env.WPP_SESSION || 'zabbix',

  // Grupos do WhatsApp
  WHATSAPP_GROUPS: {
    CRITICO: process.env.WHATSAPP_GROUP_CRITICO || 'CRITICO',
    ALERTA: process.env.WHATSAPP_GROUP_ALERTA || 'ALERTA',
    INFO: process.env.WHATSAPP_GROUP_INFO || 'INFO'
  },

  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
};

export default config; 