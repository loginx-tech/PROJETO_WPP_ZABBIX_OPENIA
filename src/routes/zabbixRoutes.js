import express from 'express';
import { getZabbixToken, getAlertas, sendWhatsAppMessage } from '../controllers/zabbixController.js';
import { config } from '../config.js';

const router = express.Router();

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
    const alertas = await getAlertas();
    res.json(alertas);
  } catch (error) {
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