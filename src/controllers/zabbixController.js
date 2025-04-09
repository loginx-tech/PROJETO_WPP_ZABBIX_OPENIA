import axios from 'axios';
import OpenAI from 'openai';
import { logs } from '../routes/zabbix.js';

// Definir a chave diretamente para garantir que funcione
const openai = new OpenAI({
  apiKey: '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'
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
    'Content-Type': 'application/json-rpc'
  }
};

let zabbixToken = null;

async function getZabbixToken() {
  if (zabbixToken) return zabbixToken;

  try {
    const response = await axios.post(ZABBIX_URL, {
      jsonrpc: '2.0',
      method: 'user.login',
      params: {
        user: process.env.ZABBIX_USER,
        password: process.env.ZABBIX_PASSWORD
      },
      id: 1,
      auth: null
    }, zabbixConfig);

    if (response.data.error) {
      throw new Error(`Zabbix API Error: ${response.data.error.message}`);
    }

    zabbixToken = response.data.result;
    return zabbixToken;
  } catch (error) {
    console.error('Error authenticating with Zabbix:', error);
    throw error;
  }
}

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

async function sendWhatsAppMessage(groupId, message) {
  try {
    await axios.post(`${WPP_URL}/api/v1/message/send-text`, {
      session: 'default',
      number: groupId,
      text: message
    }, {
      headers: {
        'Authorization': `Bearer ${WPP_SECRET_KEY}`
      }
    });
    return true;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return false;
  }
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
      targetGroups.map(groupId => sendWhatsAppMessage(groupId, whatsappMessage))
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