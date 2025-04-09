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
      const response = await axios.get('/api/alerta', {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        validateStatus: (status) => {
          return status >= 200 && status < 300;
        }
      });

      // Validar se a resposta é JSON
      if (typeof response.data === 'string') {
        console.error('Invalid response format:', response.data);
        throw new Error('Resposta inválida do servidor');
      }

      console.log('Alerts response:', response.data);
      setAlerts(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError(err.message || 'Erro ao carregar alertas');
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  }, []);

  const checkWhatsAppStatus = useCallback(async () => {
    console.log('Checking WhatsApp status...');
    try {
      const response = await axios.get('/api/whatsapp/status', {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        validateStatus: (status) => {
          return status >= 200 && status < 300;
        }
      });

      // Validar se a resposta é JSON
      if (typeof response.data === 'string' || !response.data.status) {
        console.error('Invalid status response format:', response.data);
        throw new Error('Resposta inválida do servidor');
      }

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
    try {
      setShowQrModal(true);
      setLoading(true);
      setError(null);

      const response = await axios.get('/api/whatsapp/qr');
      console.log('Resposta do QR:', response.data);

      if (response.data.status === 'CONNECTED') {
        setWhatsappStatus('CONNECTED');
        setShowQrModal(false);
      } else if (response.data.qrcode) {
        setQrCode(response.data.qrcode);
      } else {
        throw new Error('QR Code não recebido');
      }
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      setError('Erro ao gerar QR Code: ' + error.message);
    } finally {
      setLoading(false);
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
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      
      {/* Status do WhatsApp e botão de conexão */}
      <div className="mb-4 p-4 bg-white rounded shadow">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Status do WhatsApp</h2>
            <p className={`mt-2 ${whatsappStatus === 'CONNECTED' ? 'text-green-600' : 'text-red-600'}`}>
              {whatsappStatus === 'CONNECTED' ? 'Conectado' : 'Desconectado'}
            </p>
          </div>
          <button
            onClick={handleConnect}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            disabled={loading}
          >
            {loading ? 'Conectando...' : 'Conectar WhatsApp'}
          </button>
        </div>
      </div>

      {/* Modal do QR Code */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Conectar WhatsApp</h3>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                {error}
              </div>
            )}

            <div className="flex flex-col items-center">
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
              ) : qrCode ? (
                <div className="flex flex-col items-center">
                  <img
                    src={`data:image/png;base64,${qrCode}`}
                    alt="QR Code"
                    className="w-64 h-64"
                  />
                  <p className="mt-4 text-sm text-gray-600 text-center">
                    Escaneie o QR Code com seu WhatsApp para conectar
                  </p>
                </div>
              ) : (
                <p className="text-gray-600">Aguardando QR Code...</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lista de Alertas */}
      <div className="bg-white rounded shadow p-4">
        <h2 className="text-lg font-semibold mb-4">Alertas Recentes</h2>
        {loading ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="text-red-600 p-4">{error}</div>
        ) : alerts.length === 0 ? (
          <p className="text-gray-600">Nenhum alerta encontrado</p>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert, index) => (
              <div key={index} className="border p-4 rounded">
                <h3 className="font-semibold">{alert.host}</h3>
                <p className="text-gray-600">{alert.message}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {new Date(alert.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 