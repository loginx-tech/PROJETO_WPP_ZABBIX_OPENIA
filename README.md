# Zabbix IA WhatsApp Integration

This project integrates Zabbix alerts with OpenAI's GPT model and sends notifications via WhatsApp using WPPConnect.

## Project Structure

```
.
├── backend/           # Node.js + Express backend
└── frontend/         # React + Vite frontend
```

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Zabbix server access
- OpenAI API key
- WPPConnect server running

## Setup

### Development Mode

1. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Create a `.env` file in the backend directory with:
   ```
   PORT=3000
   ZABBIX_URL=http://10.0.0.11/api_jsonrpc.php
   ZABBIX_USER=zabbix-api
   ZABBIX_PASSWORD=senhaSeguraAqui
   OPENAI_API_KEY=SUA_CHAVE_OPENAI
   WPP_URL=http://10.0.0.11:21465
   WPP_SECRET_KEY=ERIONETOKEN@2025
   ```

3. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

4. Start the development servers:
   - Backend: `cd backend && npm run dev`
   - Frontend: `cd frontend && npm run dev`

### Production Mode

1. Install dependencies and build the application:
   ```bash
   cd backend
   npm install
   npm run prod
   ```

   This will:
   - Install backend dependencies
   - Install frontend dependencies
   - Build the frontend
   - Start the server in production mode

2. Access the application at `http://localhost:3000`

## Usage

1. Access the application at `http://localhost:3000`
2. Login with:
   - Username: `admin`
   - Password: `JasonBourne@2025`
3. View Zabbix alerts and AI-generated analysis

## Features

- Real-time Zabbix alert monitoring
- OpenAI-powered alert analysis
- WhatsApp notifications via WPPConnect
- Historical data visualization
- Secure authentication
- Modern UI with Tailwind CSS

## API Endpoints

### Backend

- `POST /api/alerta` - Receive Zabbix alerts
- `GET /api/logs` - Retrieve alert logs

## Security

- CORS enabled
- Environment variables for sensitive data
- Basic authentication for frontend access #   P R O J E T O _ W P P _ Z A B B I X _ I A  
 