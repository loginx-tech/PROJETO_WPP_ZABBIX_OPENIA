import { useState, useEffect, useCallback } from 'react';
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
import { Modal, Spinner, Alert, Button } from 'react-bootstrap';

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
  const [phoneNumbers, setPhoneNumbers] = useState({
    CRITICO: [],
    ALERTA: [],
    INFO: []
  });
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('CRITICO');

  const fetchAlerts = useCallback(async () => {
    console.log('Fetching alerts...');
    try {
      const response = await axios.get('/api/alerta');
      console.log('Alerts response:', response.data);
      setAlerts(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError(err.message || 'Erro ao carregar alertas');
    } finally {
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
        }
      });
      console.log('WhatsApp status response:', response.data);
      
      const status = response.data?.status || 'disconnected';
      setWhatsappStatus(status);
      
      // Fecha a modal automaticamente quando conectado
      if (status === 'CONNECTED' && showQrModal) {
        setShowQrModal(false);
        setQrCode(null);
      }
      
      return status;
    } catch (err) {
      console.error('Error checking WhatsApp status:', err);
      setWhatsappStatus('disconnected');
      return 'disconnected';
    }
  }, [showQrModal]);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (mounted) {
        await Promise.all([
          fetchAlerts(),
          checkWhatsAppStatus(),
          loadPhoneNumbers()
        ]);
      }
    };

    loadData();

    const alertsInterval = setInterval(fetchAlerts, 120000);
    const statusInterval = setInterval(checkWhatsAppStatus, 120000);

    return () => {
      mounted = false;
      clearInterval(alertsInterval);
      clearInterval(statusInterval);
    };
  }, [fetchAlerts, checkWhatsAppStatus]);

  const loadPhoneNumbers = async () => {
    try {
      const response = await axios.get('/api/phones');
      setPhoneNumbers(response.data);
    } catch (error) {
      console.error('Erro ao carregar números:', error);
      setError('Erro ao carregar números de telefone');
    }
  };

  const handleConnect = async () => {
    try {
      setShowQrModal(true);
      setLoading(true);
      setError(null);
      setQrCode(null);

      const response = await axios.get('/api/whatsapp/qr', {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      console.log('QR Code response:', response.data);

      if (!response.data || typeof response.data !== 'object') {
        throw new Error('Resposta inválida do servidor');
      }

      if (response.data.status === 'CONNECTED') {
        setWhatsappStatus('CONNECTED');
        setShowQrModal(false);
        return;
      }

      if (!response.data.qrcode) {
        throw new Error('QR Code não recebido do servidor');
      }

      // Adiciona o prefixo data:image/png;base64, se não existir
      const qrCodeData = response.data.qrcode.startsWith('data:image/png;base64,') 
        ? response.data.qrcode 
        : `data:image/png;base64,${response.data.qrcode}`;

      setQrCode(qrCodeData);

      // Inicia verificação periódica do status após exibir o QR
      const statusCheckInterval = setInterval(async () => {
        const statusResponse = await checkWhatsAppStatus();
        if (statusResponse === 'CONNECTED') {
          clearInterval(statusCheckInterval);
          setShowQrModal(false);
        }
      }, 5000); // Verifica a cada 5 segundos

      // Limpa o intervalo se o modal for fechado
      const handleModalClose = () => {
        clearInterval(statusCheckInterval);
        setShowQrModal(false);
      };

      // Timeout para o QR code após 2 minutos
      setTimeout(() => {
        clearInterval(statusCheckInterval);
        if (whatsappStatus !== 'CONNECTED') {
          setError('Tempo limite excedido. Por favor, tente novamente.');
          setQrCode(null);
        }
      }, 120000);

    } catch (err) {
      console.error('Erro ao obter QR Code:', err);
      setError(err.response?.data?.message || err.message || 'Erro ao gerar QR Code');
      setQrCode(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPhone = async () => {
    if (!newPhone) return;
    
    try {
      const response = await axios.post('/api/phones', {
        severity: selectedSeverity,
        phone: newPhone
      });
      setPhoneNumbers(response.data);
      setNewPhone('');
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao adicionar número de telefone');
    }
  };

  const handleRemovePhone = async (severity, phone) => {
    try {
      const response = await axios.delete(`/api/phones/${severity}/${phone}`);
      setPhoneNumbers(response.data);
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao remover número de telefone');
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
      
      {/* Status do WhatsApp e botões */}
      <div className="mb-4 p-4 bg-white rounded shadow">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Status do WhatsApp</h2>
            <p className={`mt-2 ${whatsappStatus === 'CONNECTED' ? 'text-green-600' : 'text-red-600'}`}>
              {whatsappStatus === 'CONNECTED' ? 'Conectado' : 'Desconectado'}
            </p>
          </div>
          <div className="space-x-2">
            <button
              onClick={handleConnect}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
              disabled={loading || whatsappStatus === 'CONNECTED'}
            >
              {loading ? 'Conectando...' : 'Conectar WhatsApp'}
            </button>
            <button
              onClick={() => setShowPhoneModal(true)}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Gerenciar Contatos
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Gerenciamento de Contatos */}
      <Modal show={showPhoneModal} onHide={() => setShowPhoneModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Gerenciar Contatos do WhatsApp</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adicionar Novo Contato
            </label>
            <div className="flex space-x-2">
              <select
                className="form-select rounded border-gray-300"
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
              >
                <option value="CRITICO">Crítico</option>
                <option value="ALERTA">Alerta</option>
                <option value="INFO">Info</option>
              </select>
              <input
                type="text"
                className="form-input rounded border-gray-300 flex-1"
                placeholder="Digite o número do WhatsApp"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
              />
              <button
                onClick={handleAddPhone}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Adicionar
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {Object.entries(phoneNumbers).map(([severity, phones]) => (
              <div key={severity} className="border rounded p-3">
                <h3 className="font-semibold mb-2">{severity}</h3>
                {phones.length === 0 ? (
                  <p className="text-gray-500">Nenhum número cadastrado</p>
                ) : (
                  <ul className="space-y-2">
                    {phones.map((phone, index) => (
                      <li key={index} className="flex justify-between items-center">
                        <span>{phone}</span>
                        <button
                          onClick={() => handleRemovePhone(severity, phone)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remover
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPhoneModal(false)}>
            Fechar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal do QR Code */}
      <Modal show={showQrModal} onHide={() => setShowQrModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Conectar WhatsApp</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {loading && (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Carregando...</span>
              </Spinner>
            </div>
          )}
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
              <div className="mt-2">
                <Button variant="primary" onClick={() => {
                  setError(null);
                  handleConnect();
                }}>
                  Tentar Novamente
                </Button>
              </div>
            </Alert>
          )}
          {!loading && !error && qrCode && (
            <div>
              <p className="mb-3">Escaneie o QR Code com seu WhatsApp</p>
              <img 
                src={qrCode} 
                alt="QR Code WhatsApp" 
                style={{ maxWidth: '100%', margin: '0 auto' }}
                onError={(e) => {
                  console.error('Erro ao carregar imagem do QR Code');
                  setError('Erro ao exibir QR Code. Por favor, tente novamente.');
                  e.target.style.display = 'none';
                }}
              />
              <p className="mt-3 text-muted">
                O QR Code expirará em 2 minutos
              </p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowQrModal(false)}>
            Fechar
          </Button>
          {(error || !qrCode) && !loading && (
            <Button variant="primary" onClick={handleConnect}>
              Gerar Novo QR Code
            </Button>
          )}
        </Modal.Footer>
      </Modal>

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