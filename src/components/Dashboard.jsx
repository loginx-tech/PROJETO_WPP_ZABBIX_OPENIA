import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { config } from '../config.js';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const severityColors = {
  CRITICO: 'bg-red-100 text-red-800',
  ALERTA: 'bg-yellow-100 text-yellow-800',
  INFO: 'bg-blue-100 text-blue-800'
};

export default function Dashboard() {
  console.log('Dashboard component rendering');
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [whatsappStatus, setWhatsappStatus] = useState('disconnected');
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCode, setQrCode] = useState(null);

  const fetchAlerts = useCallback(async () => {
    console.log('Fetching alerts...');
    try {
      const response = await axios.get('/api/alerta');
      console.log('Alerts response:', response.data);
      setAlerts(response.data);
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError('Erro ao carregar alertas');
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  }, []);

  const checkWhatsAppStatus = useCallback(async () => {
    console.log('Checking WhatsApp status...');
    try {
      const response = await axios.get('/api/whatsapp/status');
      console.log('WhatsApp status response:', response.data);
      setWhatsappStatus(response.data.status);
    } catch (err) {
      console.error('Error checking WhatsApp status:', err);
      setWhatsappStatus('disconnected');
    }
  }, []);

  useEffect(() => {
    console.log('Dashboard useEffect running');
    let mounted = true;

    const loadData = async () => {
      console.log('loadData function called, mounted:', mounted);
      if (mounted) {
        try {
          await Promise.all([
            fetchAlerts(),
            checkWhatsAppStatus()
          ]);
          console.log('Initial data load complete');
        } catch (error) {
          console.error('Error in initial data load:', error);
        }
      }
    };

    loadData();

    // Aumentando o intervalo para 2 minutos
    const alertsInterval = setInterval(() => {
      console.log('Alerts interval triggered');
      fetchAlerts();
    }, 120000);

    const statusInterval = setInterval(() => {
      console.log('Status interval triggered');
      checkWhatsAppStatus();
    }, 120000);

    return () => {
      console.log('Dashboard cleanup running');
      mounted = false;
      clearInterval(alertsInterval);
      clearInterval(statusInterval);
    };
  }, [fetchAlerts, checkWhatsAppStatus]);

  const handleConnect = async () => {
    console.log('handleConnect called');
    setShowQrModal(true);
    try {
      const response = await axios.get('/api/whatsapp/qr');
      console.log('QR code response:', response.data);
      setQrCode(response.data.qr);
      setWhatsappStatus('connecting');
    } catch (err) {
      console.error('Error generating QR code:', err);
      setError('Erro ao gerar QR Code');
      setShowQrModal(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  console.log('Current state:', { loading, error, alertsCount: alerts.length, whatsappStatus });

  if (loading) {
    console.log('Rendering loading state');
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    console.log('Rendering error state:', error);
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  console.log('Rendering main dashboard content');
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Alertas</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">WhatsApp Status:</span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              whatsappStatus === 'connected' ? 'bg-green-100 text-green-800' :
              whatsappStatus === 'disconnected' ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {whatsappStatus === 'connected' ? 'Conectado' :
               whatsappStatus === 'disconnected' ? 'Desconectado' : 'Conectando...'}
            </span>
          </div>
          <button
            onClick={handleConnect}
            disabled={whatsappStatus === 'connected'}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              whatsappStatus === 'connected'
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            Conectar WhatsApp
          </button>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Nenhum alerta encontrado.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className="bg-white shadow rounded-lg p-6 space-y-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{alert.host}</h3>
                  <p className="text-sm text-gray-500">Trigger ID: {alert.triggerId}</p>
                </div>
                <span className="text-sm text-gray-500">
                  {formatDate(alert.timestamp)}
                </span>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">Mensagem:</p>
                  <p className="mt-1 text-sm text-gray-900">{alert.mensagem}</p>
                </div>
                {alert.aiResponse && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Análise IA:</p>
                    <p className="mt-1 text-sm text-gray-900">{alert.aiResponse}</p>
                  </div>
                )}
                {alert.whatsappStatus && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Status WhatsApp:</span>
                    {alert.whatsappStatus === 'success' ? (
                      <span className="text-green-600">✓ Enviado</span>
                    ) : (
                      <span className="text-red-600">✗ Falha no envio</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showQrModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Conectar WhatsApp</h2>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col items-center justify-center">
              {qrCode ? (
                <img
                  src={qrCode}
                  alt="WhatsApp QR Code"
                  className="w-64 h-64 mb-4"
                />
              ) : (
                <div className="flex flex-col items-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                  <p className="text-gray-600">Gerando QR Code...</p>
                </div>
              )}
              <p className="text-center text-gray-600 mt-4">
                Escaneie o QR Code com seu WhatsApp para conectar
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 