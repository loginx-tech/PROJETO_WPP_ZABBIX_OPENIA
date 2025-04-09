import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { zabbixRoutes } from './routes/zabbix.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar dotenv com o caminho absoluto
const envPath = path.resolve(__dirname, '../.env');
console.log('Tentando carregar .env de:', envPath);
dotenv.config({ path: envPath });

// Log detalhado das variáveis
console.log('Variáveis de ambiente carregadas:');
console.log('PORT:', process.env.PORT);
console.log('ZABBIX_URL:', process.env.ZABBIX_URL);
console.log('ZABBIX_USER:', process.env.ZABBIX_USER);
console.log('WPP_URL:', process.env.WPP_URL);
console.log('OPENAI_API_KEY definida:', !!process.env.OPENAI_API_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', zabbixRoutes);

// Serve static files
app.use(express.static(path.join(__dirname, '../dist')));

// Handle SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});