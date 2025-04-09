import { useState, useEffect } from 'react';
import axios from 'axios';
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
    const interval = setInterval(fetchAlertas, 30000);

    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Zabbix Alerts Dashboard</h1>
        
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
    </div>
  );
} 