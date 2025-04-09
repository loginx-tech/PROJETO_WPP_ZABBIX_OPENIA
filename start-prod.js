import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  // Executar o build do frontend
  console.log('Building frontend...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // Iniciar o servidor
  console.log('Starting server...');
  execSync('node src/server.js', { stdio: 'inherit' });
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
} 