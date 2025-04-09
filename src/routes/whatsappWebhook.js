import express from 'express';
import { config } from '../config.js';
import { handleZabbixAlert } from '../controllers/zabbixController.js';

const router = express.Router();

router.post('/webhook', async (req, res) => {
  console.log('\nWEBHOOK WHATSAPP\n');
  const payload = req.body;

  if (payload.event) {
    console.log('\n\nWhatsapp Event:', payload.event);
    if (payload.from) {
      console.log('From:', payload.from);
    }
  } else {
    console.log('No event found');
  }

  if (payload.type) {
    console.log('Whatsapp Type:', payload.type);
  } else {
    console.log('No message type found');
  }

  if (!payload.event || !['onmessage', 'onanymessage', 'onselfmessage'].includes(payload.event)) {
    console.log('Payload:', payload);
  }

  switch (payload.event) {
    case 'onmessage':
      const senderId = extractPhoneNumber(payload.from);
      
      switch (payload.type) {
        case 'chat':
          console.log('Chat message received');
          const message = payload.body;
          console.log('Message:', message);
          break;

        case 'ciphertext':
          console.log('Ciphertext message received:', senderId);
          break;

        case 'e2e_notification':
          console.log('E2E Notification received:', senderId);
          break;

        case 'notification_template':
          console.log('Notification Template received:', senderId);
          break;
      }
      break;

    case 'status-find':
      console.log('\n\n\nStatus Find received');
      console.log('Payload:', payload);

      if (payload.status) {
        switch (payload.status.toLowerCase()) {
          case 'browserclose':
            console.log('Status browserClose detectado. Reiniciando sessão.');
            // Implementar reinício da sessão se necessário
            break;

          case 'qrreadsuccess':
            console.log('Status QR Read Success detectado.');
            break;

          case 'connected':
            console.log('Status CONNECTED detectado.');
            break;
        }
      }
      break;

    case 'qrcode':
      console.log('QRCODE detectado.');
      if (payload.session) {
        const sessionId = payload.session;
        const qrcode = payload.qrcode;
        // Implementar cache do QR code se necessário
      }
      break;

    default:
      console.log('!!!!! OUTRO EVENTO:', payload.event, '!!!!!!');
      console.log('Payload:', payload);
      break;
  }

  return res.json({ status: 'success' });
});

function extractPhoneNumber(from) {
  const phone = from.split('@')[0];
  return phone.replace(/^55/, ''); // Remove o código do país (55) se existir
}

export default router; 