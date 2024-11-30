import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { QrCode, CheckCircle, AlertCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';

// Configuración de Socket.IO
const socket = io('http://localhost:3001');

function App() {
  const [scannedCode, setScannedCode] = useState('');
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [stats, setStats] = useState({
    dailyAccess: 0,
    weeklyAccess: 0,
    monthlyAccess: 0,
    dailyNewCodes: 0,
  });
  const [mode, setMode] = useState<'verify' | 'register'>('verify');

  // Obtener estadísticas al montar el componente
  useEffect(() => {
    fetchStats();
  }, []);

  // Manejar eventos de Socket.IO
  useEffect(() => {
    socket.on('scanResult', (data) => {
      setScannedCode(data.code);
      setIsValid(data.isValid);

      toast(data.isValid ? '¡Acceso concedido!' : '¡Acceso denegado!', {
        icon: data.isValid ? '✅' : '❌',
      });
    });

    socket.on('updateStats', (newStats) => {
      setStats(newStats);
    });

    socket.on('doorOpened', () => {
      toast.success('¡Puerta abierta manualmente!');
    });

    return () => {
      socket.off('scanResult');
      socket.off('updateStats');
      socket.off('doorOpened');
    };
  }, []);

  // Registrar código
  const handleRegisterCode = async () => {
    if (!scannedCode) {
      toast.error('Primero escanee un código de barras');
      return;
    }

    try {
      await axios.post('http://localhost:3001/api/codes', { code: scannedCode });
      toast.success('¡Código registrado exitosamente!');
      setScannedCode('');
    } catch (error) {
      console.error('Error al registrar el código:', error);
      toast.error('Error al registrar el código');
    }
  };

  // Obtener estadísticas desde el backend
  const fetchStats = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      toast.error('No se pudieron obtener las estadísticas');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <QrCode className="h-8 w-8 text-indigo-600" />
            Sistema de control de acceso de personal Universitario
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Mode Toggle */}
        <div className="mb-8 flex justify-center gap-4">
          <button
            onClick={() => setMode('verify')}
            className={`px-4 py-2 rounded-lg ${mode === 'verify' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Modo de verificación
          </button>
          <button
            onClick={() => setMode('register')}
            className={`px-4 py-2 rounded-lg ${mode === 'register' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Modo de registro
          </button>
        </div>

        {/* Scan Status */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="text-center">
            {/* Encabezado dinámico */}
            <h2 className="text-xl font-semibold mb-4">
              {scannedCode
                ? isValid === null
                  ? 'Esperando el resultado del escaneo...'
                  : isValid
                  ? 'Código de barras válido'
                  : 'Código de barras no válido'
                : 'Ningún código escaneado todavía'}
            </h2>

            {/* Icono y mensaje visual */}
            <div className="text-6xl mb-4">
              {scannedCode ? (
                isValid !== null ? (
                  isValid ? (
                    <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
                  ) : (
                    <AlertCircle className="mx-auto h-16 w-16 text-red-500" />
                  )
                ) : (
                  'Escaneando...'
                )
              ) : (
                'Ningún código escaneado todavía'
              )}
            </div>
          </div>
        </div>

        {/* Registro de código */}
        {mode === 'register' && (
          <div className="flex justify-center">
            <button
              onClick={handleRegisterCode}
              className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-semibold"
            >
              Registrar código
            </button>
          </div>
        )}

        {/* Statistics */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <h4 className="text-lg font-semibold">Acceso diario</h4>
            <p className="text-3xl">{stats.dailyAccess}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <h4 className="text-lg font-semibold">Acceso semanal</h4>
            <p className="text-3xl">{stats.weeklyAccess}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <h4 className="text-lg font-semibold">Acceso mensual</h4>
            <p className="text-3xl">{stats.monthlyAccess}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <h4 className="text-lg font-semibold">Nuevos códigos</h4>
            <p className="text-3xl">{stats.dailyNewCodes}</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
