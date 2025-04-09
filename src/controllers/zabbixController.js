import axios from 'axios';
import config from '../config.js';
import { logs } from '../routes/zabbix.js';
import { serverConfig } from '../server/config.js';

// Log das variáveis de ambiente para debug
console.log('Environment variables:');
console.log('ZABBIX_URL:', config.ZABBIX_URL);
console.log('WPP_URL:', config.WPP_URL);

let openai = null;

// Inicializa OpenAI apenas se a chave estiver disponível
async function initializeOpenAI() {
  if (!openai && serverConfig.OPENAI_API_KEY) {
    const { default: OpenAI } = await import('openai');
    openai = new OpenAI({
      apiKey: serverConfig.OPENAI_API_KEY
    });
  }
  return openai;
}

const ZABBIX_URL = config.ZABBIX_URL;
const WPP_URL = config.WPP_URL;
const WPP_SECRET_KEY = serverConfig.WPP_SECRET_KEY;

// WhatsApp groups configuration
const WHATSAPP_GROUPS = serverConfig.WHATSAPP_GROUPS;

// Zabbix API configuration
const zabbixConfig = {
  headers: {
    'Content-Type': 'application/json'
  }
};

let zabbixToken = null;
let wppSession = null;
let wppToken = null;

// Função para gerar o token de autorização
async function generateAuthToken() {
  try {
    console.log('Tentando gerar token de autorização...');
    
    // Gera um ID de sessão único baseado no timestamp
    wppSession = `zabbix_${Date.now()}`;
    console.log('Session ID:', wppSession);
    
    const url = `${WPP_URL}/api/${wppSession}/${WPP_SECRET_KEY}/generate-token`;
    console.log('URL completa:', url);

    const response = await axios.post(url);
    
    console.log('Resposta da API:', response.data);
    
    if (response.data.status === 'success') {
      wppToken = response.data.token;
      console.log('Token gerado:', wppToken);
      return wppToken;
    } else {
      throw new Error(`Falha ao gerar token: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    console.error('Erro detalhado ao gerar token:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method,
      headers: error.config?.headers
    });
    throw new Error(`Erro ao gerar token de autorização: ${error.message}`);
  }
}

// Função para garantir que temos um token válido
async function ensureAuthToken() {
  console.log('Verificando token existente:', wppToken);
  if (!wppToken || !wppSession) {
    console.log('Token não encontrado, gerando novo token...');
    await generateAuthToken();
  }
  return wppToken;
}

export async function getZabbixToken() {
  try {
    const response = await axios.post(config.ZABBIX_URL, {
      jsonrpc: '2.0',
      method: 'user.login',
      params: {
        user: serverConfig.ZABBIX_USER,
        password: serverConfig.ZABBIX_PASSWORD
      },
      id: 1
    });
    return response.data.result;
  } catch (error) {
    console.error('Erro ao obter token Zabbix:', error);
    throw new Error('Falha ao obter token do Zabbix');
  }
}

export async function getAlertas() {
  try {
    const token = await getZabbixToken();
    const response = await axios.post(config.ZABBIX_URL, {
      jsonrpc: '2.0',
      method: 'trigger.get',
      params: {
        output: ['triggerid', 'description', 'priority', 'lastchange'],
        selectHosts: ['host'],
        filter: {
          value: 1,
          status: 0
        },
        sortfield: 'lastchange',
        sortorder: 'DESC',
        limit: 100
      },
      auth: token,
      id: 1
    });
    return response.data.result;
  } catch (error) {
    console.error('Erro ao obter alertas:', error);
    throw new Error('Falha ao obter alertas do Zabbix');
  }
}

export async function sendWhatsAppMessage(message, phone) {
  try {
    await ensureAuthToken();
    if (!phone.startsWith('55')) {
      phone = '55' + phone;
    }

    console.log(`Enviando mensagem para ${phone}:`, message);
    
    const url = `${WPP_URL}/api/${wppSession}/send-message`;
    console.log('URL para envio:', url);

    const response = await axios.post(url, {
      phone,
      message,
      isGroup: false,
      isNewsletter: false
    }, {
      headers: {
        'Authorization': `Bearer ${wppToken}`,
        'accept': '*/*',
        'Content-Type': 'application/json'
      }
    });

    console.log('Resposta do envio:', response.data);
    return response.data;
  } catch (error) {
    console.error('Erro ao enviar mensagem WhatsApp:', error.response?.data || error.message);
    throw new Error('Falha ao enviar mensagem WhatsApp');
  }
}

export const checkWhatsAppStatus = async (req, res) => {
  try {
    await ensureAuthToken();
    const url = `${WPP_URL}/api/${wppSession}/status-session`;
    console.log('URL para verificar status:', url);

    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${wppToken}`,
        'accept': '*/*',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('WhatsApp status response:', response.data);
    const status = response.data.status?.toUpperCase() || 'DISCONNECTED';

    // Se o status for QRCODE e tiver o código, retorna imediatamente
    if (status === 'QRCODE' && response.data.qrcode) {
      const qrCodeImage = response.data.qrcode.startsWith('data:image') 
        ? response.data.qrcode 
        : `data:image/png;base64,${response.data.qrcode}`;
      
      return res.json({
        status: 'success',
        qrcode: qrCodeImage
      });
    }

    // Se estiver conectado, retorna o status
    if (status === 'CONNECTED') {
      return res.json({
        status: 'success',
        message: 'Conectado'
      });
    }

    // Se estiver fechado ou indefinido, tenta iniciar uma nova sessão sem gerar novo token
    if (['CLOSED', 'UNDEFINED'].includes(status)) {
      const startSessionUrl = `${WPP_URL}/api/${wppSession}/start-session`;
      console.log('Iniciando nova sessão:', startSessionUrl);
      
      try {
        await axios.post(startSessionUrl, {
          waitQrCode: true
        }, {
          headers: {
            'Authorization': `Bearer ${wppToken}`,
            'accept': '*/*',
            'Content-Type': 'application/json'
          }
        });

        // Após iniciar a sessão, verifica o status novamente
        const newStatusResponse = await axios.get(url, {
          headers: {
            'Authorization': `Bearer ${wppToken}`,
            'accept': '*/*',
            'Content-Type': 'application/json'
          }
        });

        if (newStatusResponse.data.qrcode) {
          const qrCodeImage = newStatusResponse.data.qrcode.startsWith('data:image') 
            ? newStatusResponse.data.qrcode 
            : `data:image/png;base64,${newStatusResponse.data.qrcode}`;
          
          return res.json({
            status: 'success',
            qrcode: qrCodeImage
          });
        }
      } catch (startError) {
        console.error('Erro ao iniciar nova sessão:', startError.response?.data || startError.message);
        // Se falhar ao iniciar a sessão, aí sim geramos um novo token
        await generateAuthToken();
      }
    }

    return res.json({
      status: 'success',
      currentStatus: status
    });

  } catch (error) {
    console.error('Error checking WhatsApp status:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      // Se o erro for de autenticação, aí sim geramos um novo token
      await generateAuthToken();
      return checkWhatsAppStatus(req, res);
    }
    return res.status(500).json({ 
      error: 'Failed to check WhatsApp status',
      details: error.response?.data || error.message 
    });
  }
};

export const generateWhatsAppQR = async (req, res) => {
  try {
    await ensureAuthToken();
    const url = `${WPP_URL}/api/${wppSession}/qrcode-session`;
    console.log('URL para gerar QR:', url);

    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${wppToken}`,
        'accept': '*/*',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('QR code response:', response.data);
    
    if (response.data && response.data.qrcode) {
      const qrCodeImage = response.data.qrcode.startsWith('data:image') 
        ? response.data.qrcode 
        : `data:image/png;base64,${response.data.qrcode}`;

      return res.json({
        status: 'success',
        qrcode: qrCodeImage
      });
    }

    // Se não conseguir o QR code, tenta iniciar uma nova sessão
    const startSessionUrl = `${WPP_URL}/api/${wppSession}/start-session`;
    console.log('Tentando iniciar nova sessão para obter QR code:', startSessionUrl);
    
    await axios.post(startSessionUrl, {
      waitQrCode: true
    }, {
      headers: {
        'Authorization': `Bearer ${wppToken}`,
        'accept': '*/*',
        'Content-Type': 'application/json'
      }
    });

    // Tenta obter o QR code novamente após iniciar a sessão
    const newResponse = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${wppToken}`,
        'accept': '*/*',
        'Content-Type': 'application/json'
      }
    });

    if (newResponse.data && newResponse.data.qrcode) {
      const qrCodeImage = newResponse.data.qrcode.startsWith('data:image') 
        ? newResponse.data.qrcode 
        : `data:image/png;base64,${newResponse.data.qrcode}`;

      return res.json({
        status: 'success',
        qrcode: qrCodeImage
      });
    }

    throw new Error('QR code não disponível na resposta');
  } catch (error) {
    console.error('Error generating QR code:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      // Se o erro for de autenticação, aí sim geramos um novo token
      await generateAuthToken();
      return generateWhatsAppQR(req, res);
    }
    return res.status(500).json({ 
      error: 'Failed to generate QR code',
      details: error.response?.data || error.message 
    });
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

    let aiResponse = '';
    // Tenta usar OpenAI apenas se estiver disponível
    const ai = await initializeOpenAI();
    if (ai) {
      const prompt = generatePrompt(host, mensagem, history);
      const completion = await ai.chat.completions.create({
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
      targetGroups.map(groupId => sendWhatsAppMessage(whatsappMessage, groupId))
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