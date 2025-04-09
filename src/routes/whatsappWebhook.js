import express from 'express';
import axios from 'axios';
import config from '../config.js';
import { handleZabbixAlert } from '../controllers/zabbixController.js';

const router = express.Router();

// Rota para enviar mensagem
router.post('/send', async (req, res) => {
  try {
    const { phone, message } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Phone and message are required' 
      });
    }

    console.log(`Enviando mensagem para ${phone}:`, message);

    const response = await axios.post(`${config.WPP_URL}/api/${config.WPP_SECRET_KEY}/sendText`, {
      phone: phone.replace(/\D/g, ''), // Remove caracteres não numéricos
      message: message
    });

    console.log('Resposta do serviço de WhatsApp:', response.data);
    res.json({
      status: 'success',
      data: response.data
    });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error.response?.data || error.message);
    res.status(500).json({ 
      status: 'error',
      message: 'Erro ao enviar mensagem',
      details: error.response?.data || error.message
    });
  }
});

// Rota para verificar status
router.get('/status', async (req, res) => {
  try {
    const response = await axios.get(`${config.WPP_URL}/api/${config.WPP_SECRET_KEY}/status`);
    res.json({
      status: 'success',
      data: response.data
    });
  } catch (error) {
    console.error('Erro ao verificar status:', error.response?.data || error.message);
    res.status(500).json({ 
      status: 'error',
      message: 'Erro ao verificar status',
      details: error.response?.data || error.message
    });
  }
});

// Rota para gerar QR Code
router.get('/qr', async (req, res) => {
  try {
    const response = await axios.get(`${config.WPP_URL}/api/${config.WPP_SECRET_KEY}/status`);
    
    if (response.data && response.data.qrcode) {
      res.json({
        status: 'success',
        data: {
          qrcode: response.data.qrcode
        }
      });
    } else {
      // Se não tiver QR code, tenta iniciar uma nova sessão
      const startResponse = await axios.post(`${config.WPP_URL}/api/${config.WPP_SECRET_KEY}/start`, {
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
        res.json({
          status: 'success',
          data: {
            qrcode: newStatusResponse.data.qrcode
          }
        });
      } else {
        throw new Error('QR Code não gerado');
      }
    }
  } catch (error) {
    console.error('Erro ao gerar QR Code:', error.response?.data || error.message);
    res.status(500).json({ 
      status: 'error',
      message: 'Erro ao gerar QR Code',
      details: error.response?.data || error.message
    });
  }
});

// Rota para receber webhooks do WhatsApp
router.post('/webhook', async (req, res) => {
  try {
    const { event, type, payload } = req.body;
    
    console.log('Webhook recebido:', { event, type });
    
    // Verifica se é um evento de mensagem
    if (event === 'onmessage') {
      const { from, body } = payload;
      
      // Remove o código do país (55) do número de telefone
      const phoneNumber = from.replace('55', '');
      
      console.log('Mensagem recebida:', { phoneNumber, body });
      
      // Processa a mensagem e envia alerta do Zabbix se necessário
      await handleZabbixAlert(phoneNumber, body);
    }
    
    // Verifica se é um evento de status
    if (event === 'status-find') {
      console.log('Status atualizado:', payload);
    }
    
    // Verifica se é um evento de QR Code
    if (event === 'qrcode') {
      console.log('QR Code gerado:', payload);
    }
    
    res.json({ status: 'success' });
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    res.status(500).json({
      status: 'error',
      message: 'Falha ao processar webhook',
      details: error.message
    });
  }
});

// Helper function to format phone numbers
function extractPhoneNumber(number) {
  // Remove country code (55) if present
  return number.replace(/^55/, '');
}

export default router; 