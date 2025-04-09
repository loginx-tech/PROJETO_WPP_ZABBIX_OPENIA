import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';
import zabbixRoutes from './routes/zabbixRoutes.js';
import whatsappWebhookRoutes from './routes/whatsappWebhook.js';
import phoneRoutes from './routes/phoneRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', zabbixRoutes);
app.use('/api/whatsapp', whatsappWebhookRoutes);
app.use('/api/phones', phoneRoutes);

// Servir arquivos estáticos do React
app.use(express.static(path.join(__dirname, '../dist')));

// Rota catch-all para o React Router
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Internal server error'
  });
});

// Start server
const PORT = config.server.PORT;
const HOST = config.server.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Environment:', config.server.NODE_ENV);
  console.log('Zabbix URL:', config.zabbix.ZABBIX_URL);
  console.log('WhatsApp URL:', config.whatsapp.WPP_URL);
  console.log(`Arquivos estáticos sendo servidos de: ${path.join(__dirname, '../dist')}`);
});

export default app;