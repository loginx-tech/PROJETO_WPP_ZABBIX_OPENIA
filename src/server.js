import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { config } from './config.js';
import zabbixRoutes from './routes/zabbixRoutes.js';
import whatsappWebhook from './routes/whatsappWebhook.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.join(__dirname, '..');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// API Routes
app.use('/api', zabbixRoutes);
app.use('/api/whatsapp', whatsappWebhook);

// Serve static files from the React app
app.use(express.static(path.join(rootDir, 'dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('/*', (req, res) => {
  res.sendFile(path.join(rootDir, 'dist/index.html'));
});

const PORT = config.PORT || 3005;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Static files being served from: ${path.join(rootDir, 'dist')}`);
});