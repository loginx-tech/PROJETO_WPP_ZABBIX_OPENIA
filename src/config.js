// Configuração centralizada da aplicação
export const config = {
  // Configurações do servidor
  PORT: 3005,
  NODE_ENV: 'development',

  // Configurações do Zabbix
  ZABBIX_URL: '/api/zabbix',  // Use relative URL for client
  
  // Configurações do WhatsApp
  WPP_URL: '/api/whatsapp',   // Use relative URL for client

  // Grupos do WhatsApp
  WHATSAPP_GROUPS: {
    CRITICO: ['5511999999999@g.us'],
    ALERTA: ['5511988888888@g.us'],
    INFO: ['5511977777777@g.us']
  }
}; 