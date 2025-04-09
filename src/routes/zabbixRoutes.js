import express from 'express';
import { getZabbixToken, getAlertas, sendWhatsAppMessage } from '../controllers/zabbixController.js';
import { config } from '../config.js';

const router = express.Router();

// Array para armazenar os alertas em memória
let alertasRecebidos = [];

// Rota para obter token do Zabbix
router.get('/token', async (req, res) => {
  try {
    const token = await getZabbixToken();
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rota para obter alertas do Zabbix
router.get('/alertas', async (req, res) => {
  try {
    res.json(alertasRecebidos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rota para receber novos alertas
router.post('/alerta', async (req, res) => {
  try {
    const { host, triggerId, severity, mensagem } = req.body;
    
    // Validar dados obrigatórios
    if (!host || !triggerId || !mensagem) {
      return res.status(400).json({ error: 'Dados incompletos. Host, triggerId e mensagem são obrigatórios.' });
    }

    // Criar novo alerta
    const novoAlerta = {
      host,
      triggerId,
      severity: severity || 'UNKNOWN',
      mensagem,
      timestamp: new Date(),
      whatsappStatus: 'pending'
    };

    // Tentar enviar mensagem via WhatsApp se houver configuração
    try {
      if (config.WPP_URL && config.WPP_SECRET_KEY) {
        const grupo = severity === 'CRITICO' ? 'CRITICO' : 
                     severity === 'ALERTA' ? 'ALERTA' : 'INFO';
        
        await sendWhatsAppMessage(mensagem, grupo);
        novoAlerta.whatsappStatus = 'success';
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem WhatsApp:', error);
      novoAlerta.whatsappStatus = 'error';
    }

    // Adicionar alerta à lista
    alertasRecebidos.unshift(novoAlerta);

    // Manter apenas os últimos 100 alertas
    if (alertasRecebidos.length > 100) {
      alertasRecebidos = alertasRecebidos.slice(0, 100);
    }

    res.status(201).json(novoAlerta);
  } catch (error) {
    console.error('Erro ao processar alerta:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rota para enviar mensagem via WhatsApp
router.post('/whatsapp', async (req, res) => {
  try {
    const { mensagem, grupo } = req.body;
    const result = await sendWhatsAppMessage(mensagem, grupo);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router; 