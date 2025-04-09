import express from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();
const PHONES_FILE = path.join(process.cwd(), 'data', 'phones.json');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(path.join(process.cwd(), 'data'), { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}

// Load phones from file
async function loadPhones() {
  try {
    await ensureDataDir();
    const data = await fs.readFile(PHONES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      const defaultPhones = {
        CRITICO: [],
        ALERTA: [],
        INFO: []
      };
      await fs.writeFile(PHONES_FILE, JSON.stringify(defaultPhones, null, 2));
      return defaultPhones;
    }
    throw error;
  }
}

// Save phones to file
async function savePhones(phones) {
  await ensureDataDir();
  await fs.writeFile(PHONES_FILE, JSON.stringify(phones, null, 2));
}

// Get all phone numbers
router.get('/', async (req, res) => {
  try {
    const phones = await loadPhones();
    res.json({
      status: 'success',
      data: phones
    });
  } catch (error) {
    console.error('Error loading phones:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Erro ao carregar números de telefone',
      details: error.message
    });
  }
});

// Add a new phone number
router.post('/', async (req, res) => {
  try {
    const { severity, phone } = req.body;
    
    if (!severity || !phone) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Severity e phone são obrigatórios' 
      });
    }

    const phones = await loadPhones();
    
    if (!phones[severity]) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Severity inválida' 
      });
    }

    if (phones[severity].includes(phone)) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Número já cadastrado para esta severity' 
      });
    }

    phones[severity].push(phone);
    await savePhones(phones);
    
    res.json({
      status: 'success',
      data: phones
    });
  } catch (error) {
    console.error('Error adding phone:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Erro ao adicionar número de telefone',
      details: error.message
    });
  }
});

// Remove a phone number
router.delete('/:severity/:phone', async (req, res) => {
  try {
    const { severity, phone } = req.params;
    const phones = await loadPhones();
    
    if (!phones[severity]) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Severity inválida' 
      });
    }

    phones[severity] = phones[severity].filter(p => p !== phone);
    await savePhones(phones);
    
    res.json({
      status: 'success',
      data: phones
    });
  } catch (error) {
    console.error('Error removing phone:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Erro ao remover número de telefone',
      details: error.message
    });
  }
});

export default router; 