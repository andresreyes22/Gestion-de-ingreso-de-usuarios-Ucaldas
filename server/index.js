import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import keypress from 'keypress'; // Capturar entradas de teclado
import cors from 'cors';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173", // Cambia esto por la URL de tu frontend si es necesario
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Conexión a MongoDB
mongoose.connect('mongodb+srv://andres1701512948:xfWXyHcCOuAoZNpf@cluster0.wt1mx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Esquemas de MongoDB
const CodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});

const AccessLogSchema = new mongoose.Schema({
  code: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const Code = mongoose.model('Code', CodeSchema);
const AccessLog = mongoose.model('AccessLog', AccessLogSchema);

// Configuración para capturar entradas del teclado HID
keypress(process.stdin);
process.stdin.setRawMode(true);
process.stdin.resume();

let scannedCode = ""; // Variable para almacenar el código escaneado
let scanTimeout; // Variable para el temporizador que detecta cuando el escaneo termina

// Función para actualizar estadísticas
const updateStats = async () => {
  const now = new Date();
  const dayStart = new Date(now.setHours(0, 0, 0, 0));
  const weekStart = new Date(now.setDate(now.getDate() - 7));
  const monthStart = new Date(now.setDate(now.getDate() - 30));

  try {
    const [dailyAccess, weeklyAccess, monthlyAccess, dailyNewCodes] = await Promise.all([
      AccessLog.countDocuments({ timestamp: { $gte: dayStart } }),
      AccessLog.countDocuments({ timestamp: { $gte: weekStart } }),
      AccessLog.countDocuments({ timestamp: { $gte: monthStart } }),
      Code.countDocuments({ createdAt: { $gte: dayStart } })
    ]);

    const stats = {
      dailyAccess,
      weeklyAccess,
      monthlyAccess,
      dailyNewCodes
    };

    console.log("Updated Stats:", stats);
    io.emit('updateStats', stats); // Emitir las estadísticas actualizadas
  } catch (error) {
    console.error('Error updating stats:', error);
  }
};

// Capturar teclas del lector de códigos de barras
process.stdin.on('keypress', async (ch, key) => {
  console.log(`Key pressed: ${ch}`); // Log para cada tecla presionada
  clearTimeout(scanTimeout);

  scannedCode += ch;

  scanTimeout = setTimeout(async () => {
    if (!scannedCode) return;

    const cleanCode = scannedCode.replace(/[\r\n]+$/, '');
    scannedCode = ""; // Reset después del escaneo

    try {
      const validCode = await Code.findOne({ code: cleanCode });
      console.log(`Scanned code: ${cleanCode}`); // Log del código escaneado

      // Crear un nuevo log de acceso para todos los intentos
      const newLog = await AccessLog.create({ code: cleanCode });
      console.log(`New access log created: ${cleanCode} at ${new Date().toISOString()}`); // Log de creación de nuevo log

      // Emitir el resultado al cliente
      if (validCode) {
        io.emit('scanResult', { code: cleanCode, isValid: true });
        console.log('Valid code logged.');
      } else {
        io.emit('scanResult', { code: cleanCode, isValid: false });
        console.log('Invalid code scanned.');
      }

      // Actualizar estadísticas después del registro
      await updateStats();
    } catch (error) {
      console.error('Error processing barcode:', error);
      io.emit('error', { message: 'Error processing barcode' });
    }
  }, 200);
});

// Registrar un nuevo código
app.post('/api/codes', async (req, res) => {
  console.log(`POST /api/codes - Request received with code: ${req.body.code}`);
  try {
    const cleanCode = req.body.code.replace(/[\r\n]+$/, '');
    const newCode = await Code.create({ code: cleanCode });
    console.log(`New code registered: ${cleanCode} at ${new Date().toISOString()}`); // Log de registro de nuevo código
    await updateStats(); // Actualizar estadísticas al registrar un nuevo código
    res.status(201).json(newCode);
  } catch (error) {
    console.error('Error registering code:', error);
    res.status(400).json({ error: error.message });
  }
});

// Obtener el listado completo de códigos registrados
app.get('/api/codes', async (req, res) => {
  console.log('GET /api/codes - Request received');
  try {
    const codes = await Code.find().sort({ createdAt: -1 }); // Ordenar por fecha de creación descendente
    console.log(`Found ${codes.length} codes in the database.`);
    res.status(200).json({
      success: true,
      total: codes.length, // Número total de códigos
      data: codes
    });
  } catch (error) {
    console.error('Error fetching codes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el listado de códigos',
      error: error.message
    });
  }
});

// Obtener todos los logs de acceso
app.get('/api/accesslogs', async (req, res) => {
  console.log('GET /api/accesslogs - Request received');
  try {
    const accessLogs = await AccessLog.find().sort({ timestamp: -1 }); // Ordenar por fecha descendente
    console.log(`Found ${accessLogs.length} access logs.`);
    res.status(200).json({
      success: true,
      total: accessLogs.length,
      data: accessLogs,
    });
  } catch (error) {
    console.error('Error fetching access logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los logs de acceso',
      error: error.message,
    });
  }
});

// Obtener el último código escaneado
app.get('/api/last-scan', async (req, res) => {
  console.log('GET /api/last-scan - Request received');
  try {
    const lastAccessLog = await AccessLog.findOne().sort({ timestamp: -1 });
    if (!lastAccessLog) {
      console.log('No access logs found.');
      return res.status(404).json({ success: false, message: 'No se encontraron registros de escaneo.' });
    }

    console.log(`Last scan log retrieved: ${lastAccessLog.code} at ${lastAccessLog.timestamp.toISOString()}`); // Log al obtener el último escaneo
    
    const validCode = await Code.findOne({ code: lastAccessLog.code });
    res.status(200).json({
      success: true,
      data: {
        code: lastAccessLog.code,
        timestamp: lastAccessLog.timestamp,
        isValid: !!validCode, // Verificar si el código es válido
      },
    });
  } catch (error) {
    console.error('Error fetching last scan log:', error);
    res.status(500).json({ success: false, message: 'Error al obtener el último código escaneado.', error: error.message });
  }
});

// Inicializar el servidor
const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
