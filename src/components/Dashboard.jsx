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
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [whatsappStatus, setWhatsappStatus] = useState('disconnected');
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const fetchAlerts = async () => {
    try {
      const response = await axios.get('/api/alerta');
      setAlerts(response.data);
      setLoading(false);
    } catch (err) {
      setError('Erro ao carregar alertas');
      setLoading(false);
    }
  };

  const checkWhatsAppStatus = async () => {
    try {
      const response = await axios.get('/api/whatsapp/status');
      setWhatsappStatus(response.data.status);
    } catch (err) {
      setWhatsappStatus('disconnected');
    }
  };

  const handleConnect = async () => {
    setShowQrModal(true);
    try {
      const response = await axios.get('/api/whatsapp/qr');
      setQrCode(response.data.qr);
      setWhatsappStatus('connecting');
    } catch (err) {
      setError('Erro ao gerar QR Code');
      setShowQrModal(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    checkWhatsAppStatus();
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const QrCodeModal = ({ isOpen, onClose, qrCode }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Conectar WhatsApp</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
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
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Zabbix Alerts Dashboard</h1>
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
            disabled={isCheckingStatus || whatsappStatus === 'connected'}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              isCheckingStatus || whatsappStatus === 'connected'
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isCheckingStatus ? 'Conectando...' : 'Conectar WhatsApp'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Nenhum alerta encontrado.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {alerts.map((alerta, index) => (
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
          ))}
        </div>
      )}
      
      <QrCodeModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        qrCode={qrCode}
      />
    </div>
  );
} 