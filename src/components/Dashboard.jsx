import { useState, useEffect } from 'react';
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
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [whatsappStatus, setWhatsappStatus] = useState('disconnected');
  const [qrCode, setQrCode] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);

  const checkWhatsAppStatus = async () => {
    try {
      const response = await axios.get(`${config.WPP_URL}/api/status`);
      setWhatsappStatus(response.data.status);
    } catch (error) {
      console.error('Erro ao verificar status do WhatsApp:', error);
      setWhatsappStatus('error');
    }
  };

  const getQrCode = async () => {
    try {
      const response = await axios.get(`${config.WPP_URL}/api/start-session`);
      if (response.data.qrcode) {
        setQrCode(response.data.qrcode);
        setShowQrModal(true);
      }
    } catch (error) {
      console.error('Erro ao obter QR Code:', error);
    }
  };

  useEffect(() => {
    const fetchAlertas = async () => {
      try {
        const response = await axios.get('/api/alertas');
        setAlertas(response.data);
      } catch (error) {
        console.error('Error fetching alertas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlertas();
    checkWhatsAppStatus();

    // Atualiza a cada 3 segundos
    const alertasInterval = setInterval(fetchAlertas, 3000);
    const statusInterval = setInterval(checkWhatsAppStatus, 3000);

    return () => {
      clearInterval(alertasInterval);
      clearInterval(statusInterval);
    };
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Modal do QR Code
  const QrCodeModal = () => {
    if (!showQrModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl">
          <h3 className="text-xl font-bold mb-4">Conectar WhatsApp</h3>
          {qrCode ? (
            <div className="mb-4">
              <img src={qrCode} alt="QR Code" className="mx-auto" />
              <p className="text-sm text-gray-600 text-center mt-2">
                Escaneie o código QR com seu WhatsApp
              </p>
            </div>
          ) : (
            <p>Carregando QR Code...</p>
          )}
          <button
            onClick={() => setShowQrModal(false)}
            className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Zabbix Alerts Dashboard</h1>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">WhatsApp Status:</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                whatsappStatus === 'connected' ? 'bg-green-100 text-green-800' :
                whatsappStatus === 'disconnected' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {whatsappStatus === 'connected' ? 'Conectado' :
                 whatsappStatus === 'disconnected' ? 'Desconectado' :
                 'Conectando...'}
              </span>
            </div>
            
            <button
              onClick={getQrCode}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Conectar WhatsApp
            </button>
          </div>
        </div>
        
        <div className="space-y-6">
          {alertas.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-6">
              <p className="text-gray-500 text-center">Nenhum alerta encontrado.</p>
            </div>
          ) : (
            alertas.map((alerta, index) => (
              <div
                key={index}
                className="bg-white shadow rounded-lg p-6 space-y-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-xl font-semibold text-gray-900">
                        {alerta.host}
                      </h2>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${severityColors[alerta.severity] || 'bg-gray-100 text-gray-800'}`}>
                        {alerta.severity || 'UNKNOWN'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Trigger ID: {alerta.triggerId}
                    </p>
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatDate(alerta.timestamp || new Date())}
                  </span>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Mensagem
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {alerta.mensagem}
                    </p>
                  </div>
                </div>

                {alerta.aiResponse && (
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Análise da IA
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {alerta.aiResponse}
                      </p>
                    </div>
                  </div>
                )}

                {alerta.whatsappStatus && (
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Status WhatsApp
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-700">Enviado:</span>
                      {alerta.whatsappStatus === 'success' ? (
                        <span className="text-green-500">✓</span>
                      ) : (
                        <span className="text-red-500">✗</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      <QrCodeModal />
    </div>
  );
} 