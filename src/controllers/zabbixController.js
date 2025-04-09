import axios from 'axios';
import OpenAI from 'openai';
import { logs } from '../routes/zabbix.js';
import { config } from '../config.js';

// Log das variáveis de ambiente para debug
console.log('Environment variables:');
console.log('ZABBIX_URL:', process.env.ZABBIX_URL);
console.log('WPP_URL:', process.env.WPP_URL);

// Definir a chave diretamente para garantir que funcione
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const ZABBIX_URL = process.env.ZABBIX_URL;
const WPP_URL = process.env.WPP_URL;
const WPP_SECRET_KEY = process.env.WPP_SECRET_KEY;

// WhatsApp groups configuration
const WHATSAPP_GROUPS = {
  CRITICO: ['5511999999999@g.us'],
  ALERTA: ['5511988888888@g.us'],
  INFO: ['5511977777777@g.us']
};

// Zabbix API configuration
const zabbixConfig = {
  headers: {
    'Content-Type': 'application/json'
  }
};

let zabbixToken = null;

export const getZabbixToken = async () => {
  try {
    const response = await axios.post(config.ZABBIX_URL, {
      jsonrpc: '2.0',
      method: 'user.login',
      params: {
        user: config.ZABBIX_USER,
        password: config.ZABBIX_PASSWORD
      },
      id: 1
    });
    return response.data.result;
  } catch (error) {
    throw new Error(`Erro ao obter token do Zabbix: ${error.message}`);
  }
};

export const getAlertas = async () => {
  try {
    if (!zabbixToken) {
      await getZabbixToken();
    }

    const response = await axios.post(`${config.zabbix.url}/api_jsonrpc.php`, {
      jsonrpc: '2.0',
      method: 'problem.get',
      params: {
        output: 'extend',
        selectHosts: ['host'],
        sortfield: ['eventid'],
        sortorder: 'DESC',
        limit: 10
      },
      auth: zabbixToken,
      id: 2
    });

    return response.data.result;
  } catch (error) {
    console.error('Erro ao obter alertas do Zabbix:', error);
    throw error;
  }
};

export const checkWhatsAppStatus = async () => {
  try {
    const response = await axios.get(`${config.WPP_URL}/api/session/status`, {
      headers: {
        'Authorization': `Bearer ${config.WPP_SECRET_KEY}`
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(`Erro ao verificar status do WhatsApp: ${error.message}`);
  }
};

export const generateWhatsAppQR = async () => {
  try {
    // Primeiro, inicia a sessão
    const startResponse = await axios.post(`${config.WPP_URL}/api/session/start`, {}, {
      headers: {
        'Authorization': `Bearer ${config.WPP_SECRET_KEY}`
      }
    });

    if (startResponse.data.status === 'CONNECTED') {
      return { status: 'CONNECTED' };
    }

    // Se não estiver conectado, solicita o QR Code
    const qrResponse = await axios.get(`${config.WPP_URL}/api/session/qr-code`, {
      headers: {
        'Authorization': `Bearer ${config.WPP_SECRET_KEY}`
      }
    });

    return qrResponse.data;
  } catch (error) {
    throw new Error(`Erro ao gerar QR Code: ${error.message}`);
  }
};

export const sendWhatsAppMessage = async (mensagem, grupo) => {
  try {
    const grupos = config.WHATSAPP_GROUPS[grupo] || [];
    
    if (grupos.length === 0) {
      throw new Error(`Nenhum grupo configurado para o tipo: ${grupo}`);
    }

    const promises = grupos.map(async (phoneNumber) => {
      const response = await axios.post(`${config.WPP_URL}/api/message/text`, {
        number: phoneNumber,
        options: {
          delay: 1200,
          presence: "composing"
        },
        textMessage: mensagem
      }, {
        headers: {
          'Authorization': `Bearer ${config.WPP_SECRET_KEY}`
        }
      });
      return response.data;
    });

    const results = await Promise.all(promises);
    return { success: true, results };
  } catch (error) {
    throw new Error(`Erro ao enviar mensagem WhatsApp: ${error.message}`);
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

export async function handleZabbixAlert(req, res) {
  try {
    const { host, triggerId, mensagem } = req.body;

    const triggerResult = await zabbixRequest('trigger.get', {
      triggerids: triggerId,
      output: 'extend',
      selectItems: 'extend'
    });

    if (!triggerResult || triggerResult.length === 0) {
      throw new Error('Trigger not found');
    }

    const itemId = triggerResult[0].items[0].itemid;

    const history = await zabbixRequest('history.get', {
      itemids: itemId,
      output: 'extend',
      sortfield: 'clock',
      sortorder: 'DESC',
      limit: 5
    });

    const prompt = generatePrompt(host, mensagem, history);
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4",
    });

    const aiResponse = completion.choices[0].message.content;

    const severity = determineAlertSeverity(mensagem);
    const targetGroups = WHATSAPP_GROUPS[severity];

    const whatsappMessage = `🚨 *Alerta Zabbix - ${severity}*\n\n` +
      `*Host:* ${host}\n` +
      `*Mensagem:* ${mensagem}\n\n` +
      `*Análise da IA:*\n${aiResponse}`;

    const sendResults = await Promise.all(
      targetGroups.map(groupId => sendWhatsAppMessage(whatsappMessage, groupId))
    );

    const log = {
      host,
      triggerId,
      history,
      prompt,
      aiResponse,
      severity,
      timestamp: new Date().toISOString(),
      recipients: targetGroups,
      sendStatus: sendResults
    };

    logs.push(log);

    res.json({ 
      success: true, 
      message: 'Alert processed successfully',
      severity,
      groupsNotified: targetGroups
    });
  } catch (error) {
    console.error('Error processing alert:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.response?.data || error.stack
    });
  }
}

export function getLogs(req, res) {
  res.json(logs);
} 