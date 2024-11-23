// backend/index.js
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
    origin: "http://localhost:5173",  // Cambia esto por la URL de tu frontend si es necesario
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

let scannedCode = "";  // Variable para almacenar el código escaneado
let scanTimeout;  // Variable para el temporizador que detecta cuando el escaneo termina

// Capturar teclas del lector de códigos de barras
process.stdin.on('keypress', async (ch, key) => {
  console.log('Key pressed:', ch);  // Log para depurar

  // Si el lector de código de barras ha dejado de enviar teclas por un intervalo de tiempo,
  // consideramos que el escaneo ha terminado.
  clearTimeout(scanTimeout);  // Limpiar cualquier temporizador previo

  // Acumular los caracteres del código escaneado
  scannedCode += ch;

  // Establecer un nuevo temporizador para detectar el fin del escaneo (2 segundos sin entrada)
  scanTimeout = setTimeout(async () => {
    if (!scannedCode) {
      console.log("No barcode scanned yet.");
      return;  // Asegurarse de que se haya escaneado algo
    }

    console.log(`Scanned Code: ${scannedCode}`);  // Verificar el código completo escaneado

    try {
      // Eliminar caracteres no deseados (como \r y \n)
      const cleanCode = scannedCode.replace(/[\r\n]+$/, '');
      
      // Verificar si el código existe en la colección Code (códigos válidos)
      const validCode = await Code.findOne({ code: cleanCode });
      if (validCode) {
        // Guardar el intento de acceso en AccessLog si el código es válido
        await AccessLog.create({ code: cleanCode });
        io.emit('scanResult', { code: cleanCode, isValid: true });
        console.log('Valid code scanned and logged.');
      } else {
        io.emit('scanResult', { code: cleanCode, isValid: false });
        console.log('Invalid code scanned.');
      }
    } catch (error) {
      console.error('Error processing barcode:', error);
      io.emit('error', { message: 'Error processing barcode' });
    }

    // Limpiar la variable scannedCode después de procesarlo
    scannedCode = "";
  }, 2000);  // Espera 2 segundos después de la última tecla presionada antes de considerar que el escaneo ha terminado
});

// API para simular el escaneo de un código de barras
app.post('/api/simulate/scan', async (req, res) => {
  const { code } = req.body;
  try {
    const validCode = await Code.findOne({ code });
    if (validCode) {
      await AccessLog.create({ code });
      io.emit('scanResult', { code, isValid: true });
      res.json({ success: true, isValid: true });
    } else {
      io.emit('scanResult', { code, isValid: false });
      res.json({ success: true, isValid: false });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar un nuevo código
app.post('/api/codes', async (req, res) => {
  try {
    const cleanCode = req.body.code.replace(/[\r\n]+$/, '');  // Eliminar \r y \n al final
    const newCode = await Code.create({ code: cleanCode });
    res.status(201).json(newCode);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Estadísticas de accesos y nuevos códigos
app.get('/api/stats', async (req, res) => {
  const now = new Date();

  // Cálculos de tiempo
  const dayStart = new Date(now.setHours(0, 0, 0, 0)); // Inicio del día
  const weekStart = new Date(now.setDate(now.getDate() - 7)); // Últimos 7 días
  const monthStart = new Date(now.setDate(now.getDate() - 30)); // Últimos 30 días

  try {
    // Consultas a las colecciones
    const [dailyAccess, weeklyAccess, monthlyAccess, dailyNewCodes] = await Promise.all([
      AccessLog.countDocuments({ timestamp: { $gte: dayStart } }), // Accesos hoy
      AccessLog.countDocuments({ timestamp: { $gte: weekStart } }), // Accesos última semana
      AccessLog.countDocuments({ timestamp: { $gte: monthStart } }), // Accesos último mes
      Code.countDocuments({ createdAt: { $gte: dayStart } }) // Códigos nuevos hoy
    ]);

    // Crear objeto de estadísticas
    const stats = {
      dailyAccess, // Accesos hoy
      weeklyAccess, // Accesos semana
      monthlyAccess, // Accesos mes
      dailyNewCodes // Nuevos códigos hoy
    };

    // Responder al frontend
    res.json(stats);

    // Emitir evento a través de Socket.io (opcional)
    io.emit('updateStats', stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Error fetching stats' });
  }
});


// Inicializar el servidor
const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Ready to scan barcodes. Press "Ctrl+C" to exit.');
});
