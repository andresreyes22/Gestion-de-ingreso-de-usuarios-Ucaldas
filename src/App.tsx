import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
import { BarChart, CheckCircle, AlertCircle } from 'react-feather';

function App() {
  const [scannedCode, setScannedCode] = useState('');
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [mode, setMode] = useState<'verify' | 'register'>('verify');
  const [stats, setStats] = useState({
    dailyAccess: 0,
    weeklyAccess: 0,
    monthlyAccess: 0,
    dailyNewCodes: 0,
  });
  const [codes, setCodes] = useState<string[]>([]);
  const [accessLogs, setAccessLogs] = useState([]);
  const [scanTimeout, setScanTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchStats();
    fetchCodes();
    fetchAccessLogs();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/stats');
      setStats(response.data);
    } catch (error) {
      toast.error('Error al obtener las estadísticas');
    }
  };

  const fetchCodes = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/codes');
      setCodes(response.data.data);
    } catch (error) {
      toast.error('Error al obtener los códigos registrados');
    }
  };

  const fetchAccessLogs = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/accesslogs');
      setAccessLogs(response.data.data);
    } catch (error) {
      toast.error('Error al obtener los logs de acceso');
    }
  };

  // const handleScanInput = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const inputCode = e.target.value.trim(); // Eliminar espacios adicionales
  //   setScannedCode(inputCode);
  
  //   // Limpiar cualquier timeout anterior
  //   if (scanTimeout) {
  //     clearTimeout(scanTimeout);
  //     setScanTimeout(null);
  //   }
  
  //   if (inputCode.length > 0) {
  //     verifyCode(inputCode); // Verificar código directamente
  //     setScannedCode(''); // Limpiar el campo después de verificar
  //   } else {
  //     // Manejar casos de input vacío o invalidez
  //     const timeout = setTimeout(() => {
  //       if (inputCode === scannedCode) {
  //         setScannedCode(''); // Limpiar entrada
  //         setIsValid(null); // Reiniciar estado visual
  //         toast.error('Escaneo incompleto o código inválido');
  //       }
  //     }, 3000);
  //     setScanTimeout(timeout);
  //   }
  // };
  const handleScanInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputCode = e.target.value.trim(); // Eliminar espacios adicionales
    setScannedCode(inputCode);
  
    // Limpiar cualquier timeout anterior
    if (scanTimeout) {
      clearTimeout(scanTimeout);
      setScanTimeout(null);
    }
  
    // Asumir que el código es completo si tiene una longitud específica (opcional)
    if (inputCode.length >= 8) {
      // Establecer un timeout para esperar si el código está completo
      const timeout = setTimeout(() => {
        verifyCode(inputCode); // Verificar código cuando el código esté completo
        setScannedCode(''); // Limpiar el campo después de verificar
      }, 2000); // Ajustar el tiempo según el comportamiento del escáner
      setScanTimeout(timeout);
    } else {
      // Manejar casos de input vacío o invalidez
      const timeout = setTimeout(() => {
        if (inputCode === scannedCode) {
          setScannedCode(''); // Limpiar entrada
          setIsValid(null); // Reiniciar estado visual
          toast.error('Escaneo incompleto o código inválido');
        }
      }, 3000);
      setScanTimeout(timeout);
    }
  };
  
  const verifyCode = async (code: string) => {
    try {
      const response = await axios.post('http://localhost:3001/api/simulate/scan', { code });
      console.log('Respuesta del backend:', response.data);
      setIsValid(response.data.isValid);
      toast(response.data.isValid ? '¡Acceso concedido!' : '¡Acceso denegado!', {
        icon: response.data.isValid ? '✅' : '❌',
      });
    } catch (error) {
      console.error('Error en verifyCode:', error);
      setIsValid(false);
      toast.error('Error al verificar el código');
    }
  };
  
  
  const handleRegisterCode = async () => {
    try {
      await axios.post('http://localhost:3001/api/codes', { code: scannedCode });
      toast.success('Código registrado exitosamente');
      setScannedCode('');
      fetchCodes();
    } catch (error) {
      toast.error('Error al registrar el código');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart className="h-8 w-8 text-indigo-600" />
            Sistema de control de acceso de personal Universitario
          </h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
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

        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4">
              {mode === 'verify' ? 'Verificar código de barras' : 'Registrar nuevo código de barras'}
            </h2>
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

        <div className="mb-8 flex justify-center">
          <input
            type="text"
            value={scannedCode}
            onChange={handleScanInput}
            placeholder="Escanear código de barras..."
            className="px-4 py-2 border rounded-lg w-72 text-center"
          />
        </div>

        <div className="flex justify-center gap-6">
          {mode === 'register' && (
            <button
              onClick={handleRegisterCode}
              className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-semibold"
            >
              Registrar código
            </button>
          )}
        </div>

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
            <h4 className="text-lg font-semibold">Códigos nuevos hoy</h4>
            <p className="text-3xl">{stats.dailyNewCodes}</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
