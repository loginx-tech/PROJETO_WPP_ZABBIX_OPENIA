// Configuração centralizada da aplicação
export const config = {
  // Configurações do servidor
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Configurações do Zabbix
  ZABBIX_URL: process.env.ZABBIX_URL || 'http://10.0.0.11/api_jsonrpc.php',
  ZABBIX_USER: process.env.ZABBIX_USER || 'Admin',
  ZABBIX_PASSWORD: process.env.ZABBIX_PASSWORD || '540298cb',

  // Configurações do OpenAI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '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',

  // Configurações do WhatsApp
  WPP_URL: process.env.WPP_URL || 'http://10.0.0.11:21465',
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