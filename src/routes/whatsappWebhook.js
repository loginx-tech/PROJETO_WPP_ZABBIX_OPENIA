import express from 'express';
import axios from 'axios';
import { config } from '../config.js';
import { handleZabbixAlert } from '../controllers/zabbixController.js';

const router = express.Router();

// Rota para enviar mensagem
router.post('/send', async (req, res) => {
  try {
    const { phone, message } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({ 
        error: 'Phone and message are required' 
      });
    }

    console.log(`Enviando mensagem para ${phone}:`, message);

    const response = await axios.post(`${config.WPP_URL}/api/send-message`, {
      number: phone.replace(/\D/g, ''), // Remove caracteres não numéricos
      message: message
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.WPP_SECRET_KEY}`
      }
    });

    console.log('Resposta do serviço de WhatsApp:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Erro ao enviar mensagem',
      details: error.response?.data || error.message
    });
  }
});

// Rota para verificar status
router.get('/status', async (req, res) => {
  try {
    const response = await axios.get(`${config.WPP_URL}/api/status`, {
      headers: {
        'Authorization': `Bearer ${config.WPP_SECRET_KEY}`
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Erro ao verificar status:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Erro ao verificar status',
      details: error.response?.data || error.message
    });
  }
});

// Rota para gerar QR Code
router.get('/qr', async (req, res) => {
  try {
    const response = await axios.get(`${config.WPP_URL}/api/qr-code`, {
      headers: {
        'Authorization': `Bearer ${config.WPP_SECRET_KEY}`
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Erro ao gerar QR Code:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Erro ao gerar QR Code',
      details: error.response?.data || error.message
    });
  }
});

// Webhook para receber eventos do WhatsApp
router.post('/', (req, res) => {
  try {
    const event = req.body;
    console.log('Evento WhatsApp recebido:', event);

    // Processa diferentes tipos de eventos
    switch (event.type) {
      case 'message':
        console.log('Mensagem recebida:', event.message);
        break;
      case 'status':
        console.log('Status atualizado:', event.status);
        break;
      case 'qrcode':
        console.log('Novo QR Code gerado');
        break;
      default:
        console.log('Evento não reconhecido:', event.type);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    res.status(500).json({ error: 'Erro ao processar webhook' });
  }
});

function extractPhoneNumber(from) {
  const phone = from.split('@')[0];
  return phone.replace(/^55/, ''); // Remove o código do país (55) se existir
}

export default router; 