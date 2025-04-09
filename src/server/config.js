import dotenv from 'dotenv';
dotenv.config();

export const serverConfig = {
  // Configurações do servidor
  PORT: process.env.PORT || 3005,
  NODE_ENV: process.env.NODE_ENV || 'development',
  APP_HOST: process.env.APP_HOST || 'localhost',
  APP_PORT: process.env.APP_PORT || 3001,

  // Configurações do Zabbix
  ZABBIX_URL: process.env.ZABBIX_URL || 'http://localhost/api_jsonrpc.php',
  ZABBIX_USER: process.env.ZABBIX_USER || 'Admin',
  ZABBIX_PASSWORD: process.env.ZABBIX_PASSWORD || 'zabbix',

  // Configurações do OpenAI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,

  // Configurações do WhatsApp
  WPP_URL: process.env.WPP_URL || 'http://localhost:21465',
  WPP_SECRET_KEY: process.env.WPP_SECRET_KEY || 'ERIONETOKEN@2025',

  // Configurações de autenticação
  AUTH_USERNAME: process.env.AUTH_USERNAME || 'admin',
  AUTH_PASSWORD: process.env.AUTH_PASSWORD || 'JasonBourne@2025',

  // Grupos do WhatsApp
  WHATSAPP_GROUPS: {
    CRITICO: ['5511999999999@g.us'],
    ALERTA: ['5511988888888@g.us'],
    INFO: ['5511977777777@g.us']
  }
}; 