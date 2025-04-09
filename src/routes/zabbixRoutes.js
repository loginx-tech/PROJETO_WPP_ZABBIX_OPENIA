import express from 'express';
import { getZabbixToken, getAlertas, sendWhatsAppMessage, checkWhatsAppStatus, generateWhatsAppQR, getLogs } from '../controllers/zabbixController.js';
import config from '../config.js';
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
    res.json({
      status: 'success',
      data: { token }
    });
  } catch (error) {
    console.error('Erro ao obter token:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Erro ao obter token do Zabbix',
      details: error.message
    });
  }
});

// Rota para obter alertas do Zabbix
router.get('/alerta', async (req, res) => {
  try {
    const alertas = await getAlertas();
    res.json({
      status: 'success',
      data: alertas
    });
  } catch (error) {
    console.error('Erro ao obter alertas:', error);
    res.status(500).json({
      status: 'error',
      message: 'Falha ao obter alertas do Zabbix',
      details: error.message
    });
  }
});

// Rota para verificar status do WhatsApp
router.get('/whatsapp/status', async (req, res) => {
  try {
    const status = await checkWhatsAppStatus();
    res.json({
      status: 'success',
      data: status
    });
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Falha ao verificar status do WhatsApp',
      details: error.message
    });
  }
});

// Rota para gerar QR Code do WhatsApp
router.get('/whatsapp/qr', async (req, res) => {
  try {
    const qrCode = await generateWhatsAppQR();
    res.json({
      status: 'success',
      data: qrCode
    });
  } catch (error) {
    console.error('Erro ao gerar QR Code:', error);
    res.status(500).json({
      status: 'error',
      message: 'Falha ao gerar QR Code do WhatsApp',
      details: error.message
    });
  }
});

// Rota para receber alertas do Zabbix
router.post('/alerta', async (req, res) => {
  try {
    const alert = req.body;
    console.log('Alerta recebido:', alert);
    
    // Notifica os contatos cadastrados
    await notifyAlert(alert);
    
    res.json({ 
      status: 'success',
      message: 'Alerta processado com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao processar alerta:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Erro ao processar alerta',
      details: error.message
    });
  }
});

// Rota para enviar mensagem via WhatsApp
router.post('/whatsapp/send', async (req, res) => {
  try {
    const { phone, message } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({
        status: 'error',
        message: 'Telefone e mensagem são obrigatórios'
      });
    }

    const result = await sendWhatsAppMessage(phone, message);
    res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({
      status: 'error',
      message: 'Falha ao enviar mensagem via WhatsApp',
      details: error.message
    });
  }
});

// Rota para obter logs
router.get('/logs', getLogs);

export default router; 