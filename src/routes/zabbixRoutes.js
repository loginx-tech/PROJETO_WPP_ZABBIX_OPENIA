import express from 'express';
import { getZabbixToken, getAlertas, sendWhatsAppMessage, checkWhatsAppStatus, generateWhatsAppQR } from '../controllers/zabbixController.js';
import { config } from '../config.js';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();
const PHONES_FILE = path.join(process.cwd(), 'data', 'phones.json');

// Middleware para garantir respostas JSON
router.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Array para armazenar os alertas em memória
let alertasRecebidos = [];

async function loadPhones() {
  try {
    const data = await fs.readFile(PHONES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { CRITICO: [], ALERTA: [], INFO: [] };
    }
    throw error;
  }
}

async function notifyAlert(alert) {
  try {
    const phones = await loadPhones();
    let severity = 'INFO';
    
    // Determina a severidade com base na prioridade do Zabbix
    if (alert.priority >= 4) {
      severity = 'CRITICO';
    } else if (alert.priority >= 2) {
      severity = 'ALERTA';
    }

    const message = `*${severity}*\n\n` +
      `*Host:* ${alert.host}\n` +
      `*Problema:* ${alert.problem}\n` +
      `*Severidade:* ${alert.severity}\n` +
      `*Data:* ${new Date(alert.time).toLocaleString('pt-BR')}\n\n` +
      `*Status:* ${alert.status}`;

    const targetPhones = phones[severity];
    console.log(`Enviando alerta ${severity} para ${targetPhones.length} números`);

    for (const phone of targetPhones) {
      await sendWhatsAppMessage(message, phone.replace('+', ''));
    }
  } catch (error) {
    console.error('Erro ao notificar alerta:', error);
  }
}

// Rota para obter token do Zabbix
router.get('/token', async (req, res) => {
  try {
    const token = await getZabbixToken();
    res.json({ token });
  } catch (error) {
    console.error('Erro ao obter token:', error);
    res.status(500).json({ error: 'Erro ao obter token do Zabbix' });
  }
});

// Rota para obter alertas do Zabbix
router.get('/alerta', async (req, res) => {
  try {
    const alertas = await getAlertas();
    res.json(alertas);
  } catch (error) {
    console.error('Erro ao obter alertas:', error);
    res.status(500).json({ error: 'Erro ao obter alertas' });
  }
});

// Rota para verificar status do WhatsApp
router.get('/whatsapp/status', async (req, res) => {
  try {
    const status = await checkWhatsAppStatus();
    res.json(status);
  } catch (error) {
    console.error('Erro ao verificar status do WhatsApp:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rota para obter QR Code do WhatsApp
router.get('/whatsapp/qr', async (req, res) => {
  try {
    const qrData = await generateWhatsAppQR();
    res.json(qrData);
  } catch (error) {
    console.error('Erro ao gerar QR Code:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rota para receber alertas do Zabbix
router.post('/alerta', async (req, res) => {
  try {
    const alert = req.body;
    console.log('Alerta recebido:', alert);
    
    // Notifica os contatos cadastrados
    await notifyAlert(alert);
    
    res.json({ success: true, message: 'Alerta processado com sucesso' });
  } catch (error) {
    console.error('Erro ao processar alerta:', error);
    res.status(500).json({ error: 'Erro ao processar alerta' });
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