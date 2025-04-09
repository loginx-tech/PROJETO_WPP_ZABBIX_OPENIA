import axios from 'axios';
import config from '../config.js';
import OpenAI from 'openai';

// Log das variáveis de ambiente para debug
console.log('Environment variables:');
console.log('ZABBIX_URL:', config.ZABBIX_URL);
console.log('WPP_URL:', config.WPP_URL);

// Inicializa o OpenAI apenas se a chave estiver disponível
let openai = null;
if (config.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: config.OPENAI_API_KEY
  });
}

// Configuração dos grupos do WhatsApp
const WHATSAPP_GROUPS = {
  ZABBIX: config.WHATSAPP_GROUP_ZABBIX,
  SUPORTE: config.WHATSAPP_GROUP_SUPORTE
};

// Configuração da API do Zabbix
const ZABBIX_URL = config.ZABBIX_URL;
const ZABBIX_USER = config.ZABBIX_USER;
const ZABBIX_PASSWORD = config.ZABBIX_PASSWORD;

// Array para armazenar logs
const logs = [];

// Função para gerar token de autenticação
export const getZabbixToken = async () => {
  try {
    const response = await axios.post(`${ZABBIX_URL}/api_jsonrpc.php`, {
      jsonrpc: '2.0',
      method: 'user.login',
      params: {
        user: ZABBIX_USER,
        password: ZABBIX_PASSWORD
      },
      id: 1
    });

    if (response.data && response.data.result) {
      return response.data.result;
    }
    throw new Error('Token de autenticação não gerado');
  } catch (error) {
    console.error('Erro ao gerar token de autenticação:', error);
    throw error;
  }
};

// Função para garantir que temos um token válido
const ensureAuthToken = async () => {
  try {
    const token = await getZabbixToken();
    return token;
  } catch (error) {
    console.error('Erro ao garantir token de autenticação:', error);
    throw error;
  }
};

// Função para obter alertas do Zabbix
export const getAlertas = async () => {
  try {
    const token = await ensureAuthToken();
    const response = await axios.post(`${ZABBIX_URL}/api_jsonrpc.php`, {
      jsonrpc: '2.0',
      method: 'problem.get',
      params: {
        output: 'extend',
        selectHosts: ['host'],
        selectTags: 'extend',
        recent: true,
        sortfield: ['eventid'],
        sortorder: 'DESC',
        limit: 10
      },
      auth: token,
      id: 1
    });

    if (response.data && response.data.result) {
      return response.data.result;
    }
    throw new Error('Nenhum alerta encontrado');
  } catch (error) {
    console.error('Erro ao obter alertas:', error);
    throw error;
  }
};

// Função para enviar mensagem via WhatsApp
export const sendWhatsAppMessage = async (phone, message) => {
  try {
    const response = await axios.post(`${config.WPP_URL}/api/${config.WPP_SECRET_KEY}/sendText`, {
      phone,
      message
    });

    if (response.data && response.data.status === 'success') {
      return response.data;
    }
    throw new Error('Falha ao enviar mensagem');
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    throw error;
  }
};

// Função para verificar status do WhatsApp
export const checkWhatsAppStatus = async () => {
  try {
    const response = await axios.get(`${config.WPP_URL}/api/${config.WPP_SECRET_KEY}/status`);
    
    if (!response.data) {
      throw new Error('Resposta inválida do servidor WhatsApp');
    }

    console.log('Status response:', response.data);

    if (response.data.status === 'CONNECTED') {
      return { status: 'connected' };
    }

    if (response.data.status === 'DISCONNECTED' || 
        response.data.status === 'CLOSED' || 
        response.data.status === 'INITIALIZING') {
      // Tenta iniciar uma nova sessão
      try {
        await axios.post(`${config.WPP_URL}/api/${config.WPP_SECRET_KEY}/start`, {
          browserArgs: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu'
          ]
        });

        // Aguarda um momento para o QR code ser gerado
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verifica novamente o status
        const newStatusResponse = await axios.get(`${config.WPP_URL}/api/${config.WPP_SECRET_KEY}/status`);
        
        if (newStatusResponse.data && newStatusResponse.data.qrcode) {
          return {
            status: 'qrcode',
            qrcode: newStatusResponse.data.qrcode
          };
        }
      } catch (startError) {
        console.error('Erro ao iniciar sessão:', startError);
        throw new Error('Falha ao iniciar sessão do WhatsApp');
      }
    }

    return { status: 'disconnected' };
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    throw error;
  }
};

// Função para gerar QR Code do WhatsApp
export const generateWhatsAppQR = async () => {
  try {
    // Primeiro verifica o status atual
    const statusResponse = await axios.get(`${config.WPP_URL}/api/${config.WPP_SECRET_KEY}/status`);
    
    if (!statusResponse.data) {
      throw new Error('Resposta inválida do servidor WhatsApp');
    }

    console.log('Status response:', statusResponse.data);

    // Se já estiver conectado, retorna status
    if (statusResponse.data.status === 'CONNECTED') {
      return { status: 'connected' };
    }

    // Se não estiver conectado, tenta iniciar uma nova sessão
    try {
      await axios.post(`${config.WPP_URL}/api/${config.WPP_SECRET_KEY}/start`, {
        browserArgs: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ]
      });

      // Aguarda um momento para o QR code ser gerado
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verifica novamente o status
      const newStatusResponse = await axios.get(`${config.WPP_URL}/api/${config.WPP_SECRET_KEY}/status`);
      
      if (newStatusResponse.data && newStatusResponse.data.qrcode) {
        return {
          status: 'qrcode',
          qrcode: newStatusResponse.data.qrcode
        };
      }

      throw new Error('QR Code não gerado');
    } catch (startError) {
      console.error('Erro ao iniciar sessão:', startError);
      throw new Error('Falha ao iniciar sessão do WhatsApp');
    }
  } catch (error) {
    console.error('Erro ao gerar QR Code:', error);
    throw error;
  }
};

async function zabbixRequest(method, params) {
  const token = await getZabbixToken();
  
  try {
    const response = await axios.post(ZABBIX_URL, {
      jsonrpc: '2.0',
      method,
      params,
      auth: token,
      id: 1
    }, zabbixConfig);

    if (response.data.error) {
      throw new Error(`Zabbix API Error: ${response.data.error.message}`);
    }

    return response.data.result;
  } catch (error) {
    if (error.response?.data?.error?.code === -32602) {
      zabbixToken = null;
      return zabbixRequest(method, params);
    }
    throw error;
  }
}

function determineAlertSeverity(message) {
  const upperMessage = message.toUpperCase();
  if (upperMessage.includes('CRITICO') || upperMessage.includes('DOWN')) {
    return 'CRITICO';
  } else if (upperMessage.includes('ALERTA') || upperMessage.includes('WARNING')) {
    return 'ALERTA';
  }
  return 'INFO';
}

function generatePrompt(host, message, history) {
  return `Analise o seguinte alerta do Zabbix:

Host: ${host}
Mensagem: ${message}
Últimos 5 valores históricos:
${history.map((h, i) => `${i + 1}. Valor: ${h.value} (${new Date(h.clock * 1000).toLocaleString()})`).join('\n')}

Por favor, forneça:
1. Uma análise técnica do problema
2. Possíveis causas
3. Sugestões de resolução
4. Nível de urgência (Alto/Médio/Baixo)

Formate a resposta de forma clara e objetiva.`;
}

// Função para processar alertas do Zabbix
export async function handleZabbixAlert(phone, message, req = null, res = null) {
  try {
    // Se for uma chamada direta da API (com req e res)
    if (req && res) {
      const { host, triggerId, mensagem } = req.body;
      
      // Obtém informações da trigger
      const triggerResult = await zabbixRequest('trigger.get', {
        triggerids: triggerId,
        output: 'extend',
        selectItems: 'extend'
      });
      
      if (!triggerResult || triggerResult.length === 0) {
        throw new Error('Trigger não encontrada');
      }
      
      const itemId = triggerResult[0].items[0].itemid;
      
      // Obtém histórico do item
      const history = await zabbixRequest('history.get', {
        itemids: itemId,
        output: 'extend',
        sortfield: 'clock',
        sortorder: 'DESC',
        limit: 5
      });
      
      let aiResponse = '';
      // Tenta usar OpenAI apenas se estiver disponível
      if (openai) {
        const prompt = generatePrompt(host, mensagem, history);
        const completion = await openai.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: "gpt-4",
        });
        aiResponse = completion.choices[0].message.content;
      }
      
      const severity = determineAlertSeverity(mensagem);
      const targetGroups = WHATSAPP_GROUPS[severity];
      
      const whatsappMessage = `🚨 *Alerta Zabbix - ${severity}*\n\n` +
        `*Host:* ${host}\n` +
        `*Mensagem:* ${mensagem}\n\n` +
        (aiResponse ? `*Análise da IA:*\n${aiResponse}` : '');
      
      const sendResults = await Promise.all(
        targetGroups.map(groupId => sendWhatsAppMessage(groupId, whatsappMessage))
      );
      
      const log = {
        host,
        triggerId,
        history,
        severity,
        timestamp: new Date().toISOString(),
        recipients: targetGroups,
        sendStatus: sendResults
      };
      
      if (aiResponse) {
        log.aiResponse = aiResponse;
      }
      
      // Adiciona o log ao array de logs
      logs.push(log);
      
      res.json({ 
        success: true, 
        message: 'Alert processed successfully',
        severity,
        groupsNotified: targetGroups
      });
    } 
    // Se for uma chamada do webhook (apenas phone e message)
    else {
      console.log(`Processando mensagem do WhatsApp: ${message} de ${phone}`);
      
      // Adiciona o log ao array de logs
      logs.push({
        phone,
        message,
        timestamp: new Date().toISOString(),
        type: 'webhook'
      });
      
      // Aqui você pode adicionar lógica para processar mensagens do WhatsApp
      // Por exemplo, verificar se é um comando, responder com informações, etc.
      
      // Exemplo: responder com uma mensagem de confirmação
      await sendWhatsAppMessage(phone, `✅ Mensagem recebida: "${message}"`);
      
      return { success: true, message: 'Message processed successfully' };
    }
  } catch (error) {
    console.error('Error processing alert:', error);
    
    if (res) {
      res.status(500).json({ 
        success: false, 
        error: error.message,
        details: error.response?.data || error.stack
      });
    } else {
      throw error;
    }
  }
}

export function getLogs(req, res) {
  try {
    res.json({
      status: 'success',
      data: logs
    });
  } catch (error) {
    console.error('Erro ao obter logs:', error);
    res.status(500).json({
      status: 'error',
      message: 'Falha ao obter logs',
      details: error.message
    });
  }
} 