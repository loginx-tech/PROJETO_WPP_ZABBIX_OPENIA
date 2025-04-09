import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import zabbixRoutes from './routes/zabbixRoutes.js';
import whatsappWebhook from './routes/whatsappWebhook.js';
import phoneRoutes from './routes/phoneRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log das variáveis de ambiente
console.log('Environment variables:');
console.log('ZABBIX_URL:', config.ZABBIX_URL);
console.log('WPP_URL:', config.WPP_URL);

// Rotas da API
app.use('/api', zabbixRoutes);
app.use('/api/webhook', whatsappWebhook);
app.use('/api/phones', phoneRoutes);

// Servir arquivos estáticos do React
app.use(express.static(path.join(__dirname, '../dist')));

// Rota catch-all para o React Router
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Iniciar o servidor
const PORT = config.APP_PORT || 3005;
const HOST = config.APP_HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Servidor rodando em http://${HOST}:${PORT}`);
  console.log(`Arquivos estáticos sendo servidos de: ${path.join(__dirname, '../dist')}`);
});

export default app;