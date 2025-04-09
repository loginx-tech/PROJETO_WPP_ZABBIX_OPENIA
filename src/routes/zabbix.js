import express from 'express';
import { handleZabbixAlert, getLogs } from '../controllers/zabbixController.js';

const router = express.Router();

// Store logs in memory
export const logs = [];

router.post('/alerta', handleZabbixAlert);
router.get('/logs', getLogs);

export { router as zabbixRoutes }; 