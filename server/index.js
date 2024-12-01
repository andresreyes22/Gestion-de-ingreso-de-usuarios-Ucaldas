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

// Endpoint para obtener estadísticas
app.get('/api/stats', async (req, res) => {
  try {
    const now = new Date();
    const dayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now.setDate(now.getDate() - 7));
    const monthStart = new Date(now.setDate(now.getDate() - 30));

    const [dailyAccess, weeklyAccess, monthlyAccess, dailyNewCodes] = await Promise.all([
      AccessLog.countDocuments({ timestamp: { $gte: dayStart } }),
      AccessLog.countDocuments({ timestamp: { $gte: weekStart } }),
      AccessLog.countDocuments({ timestamp: { $gte: monthStart } }),
      Code.countDocuments({ createdAt: { $gte: dayStart } })
    ]);

    res.json({
      dailyAccess,
      weeklyAccess,
      monthlyAccess,
      dailyNewCodes
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Error fetching stats' });
  }
});

// Endpoint para obtener códigos registrados
app.get('/api/codes', async (req, res) => {
  try {
    const codes = await Code.find();
    res.json({ data: codes });
  } catch (error) {
    console.error('Error fetching codes:', error);
    res.status(500).json({ error: 'Error fetching codes' });
  }
});

// Endpoint para obtener logs de acceso
app.get('/api/accesslogs', async (req, res) => {
  try {
    const logs = await AccessLog.find();
    res.json({ data: logs });
  } catch (error) {
    console.error('Error fetching access logs:', error);
    res.status(500).json({ error: 'Error fetching access logs' });
  }
});

// app.post('/api/simulate/scan', async (req, res) => {
//   const { code } = req.body;

//   // Verifica si el código ya está registrado en la base de datos de 'codes'
//   let foundCode = await Code.findOne({ code });

//   if (!foundCode) {
//     // Si el código no existe, lo registramos
//     foundCode = new Code({ code });
//     await foundCode.save();
//     let foundCode = await Code.findOne({ code });
//     console.log("Código encontrado:", foundCode);

//     // También, lo guardamos en los registros de acceso
//     const accessLog = new AccessLog({
//       code,
//       timestamp: new Date(),
//     });
//     await accessLog.save();

//     // Devolver la respuesta que el código es nuevo y se ha registrado
//     return res.json({ isValid: false, message: 'Código registrado y no válido aún' });
//   }

//   // Si el código está registrado, solo se devuelve como válido
//   res.json({ isValid: true, message: 'Acceso concedido', code });
// });
app.post('/api/simulate/scan', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'El código es obligatorio' });
    }

    // Verifica si el código ya está registrado en la base de datos de 'codes'
    let foundCode = await Code.findOne({ code });

    // Guardamos siempre el código escaneado en 'AccessLog'
    const accessLog = new AccessLog({
      code,
      timestamp: new Date(),
    });
    await accessLog.save();

    // Si el código no está registrado en 'Code', responder con mensaje de código no válido
    if (!foundCode) {
      return res.json({
        isValid: false,
        message: 'Código registrado en access_log pero no válido en db',
      });
    }

    // Si el código está registrado en 'Code', responder con acceso concedido
    res.json({ isValid: true, message: 'Acceso concedido', code });

  } catch (error) {
    console.error('Error en el endpoint /api/simulate/scan:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});



// Endpoint para registrar un nuevo código
app.post('/api/codes', async (req, res) => {
  try {
    const { code } = req.body;
    const newCode = new Code({ code });
    await newCode.save();
    res.status(201).json({ message: 'Código registrado exitosamente' });
  } catch (error) {
    console.error('Error al registrar el código:', error);
    res.status(500).json({ error: 'Error al registrar el código' });
  }
});

// Endpoint para obtener el último código escaneado
app.get('/api/last-scan', async (req, res) => {
  
  const { code } = req.body;
  console.log("Body recibido:", req.body);
  try {
    // Buscar el último registro de escaneo en AccessLog, ordenado por timestamp descendente
    const lastAccessLog = await AccessLog.findOne().sort({ timestamp: -1 });

    // Si no se encuentra ningún registro, enviar un error 404
    if (!lastAccessLog || !lastAccessLog.code) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron registros de escaneo o el código está vacío.',
      });
    }

    // Verificar si el código del último escaneo está registrado en la colección de códigos
    const validCode = await Code.findOne({ code: lastAccessLog.code });

    // Responder con el código escaneado, su timestamp y si es válido
    return res.status(200).json({
      success: true,
      data: {
        code: lastAccessLog.code,  // El último código escaneado
        timestamp: lastAccessLog.timestamp,  // Fecha y hora del escaneo
        isValid: !!validCode,  // Verificar si el código está registrado (booleano)
      },
    });
  } catch (error) {
    // Capturar errores del servidor y enviar un mensaje de error detallado
    console.error(error); // Para depurar errores
    return res.status(500).json({
      success: false,
      message: 'Error al obtener el último código escaneado.',
      error: error.message,
    });
  }
});


// Función para capturar la entrada del teclado
process.stdin.on('keypress', async (ch, key) => {
  if (key && key.name === 'enter') {
    try {
      const code = await Code.findOne({ code: scannedCode });
      const isValid = !!code;
      io.emit('scanResult', { code: scannedCode, isValid });
      scannedCode = ""; // Limpiar el código escaneado
    } catch (error) {
      console.error("Error al procesar el código:", error);
    }
  }
});

// Inicializar el servidor
const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
