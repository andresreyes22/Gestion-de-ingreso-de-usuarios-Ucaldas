#include <ESP8266WiFi.h>
#include <Servo.h>
#include <ArduinoJson.h>

// Configuración del WiFi
const char* ssid = "Teo";      // Reemplaza con tu SSID
const char* password = "12345678"; // Reemplaza con tu contraseña

// Configuración del servidor
const char* server = "192.168.29.156"; // Cambia por la dirección IP o URL de tu backend
const int port = 3001;

// Pines
#define SWITCH_PIN 2 // Pin donde está conectado el interruptor
#define SERVO_PIN 10  // Pin donde está conectado el servo motor

Servo servoMotor;
WiFiClient client;

void setup() {
  // Configuración del servo
  servoMotor.attach(SERVO_PIN);
  servoMotor.write(0); // Inicializar en posición inicial

  // Configuración del interruptor
  pinMode(SWITCH_PIN, INPUT_PULLUP);

  // Configuración del serial
  Serial.begin(115200);

  // Conexión WiFi
  WiFi.begin(ssid, password);
  Serial.print("Conectando a WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConexión WiFi establecida");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  // Comprobar si el interruptor está presionado
  if (digitalRead(SWITCH_PIN) == LOW) {
    activarServo();
    delay(500); // Antirrebote
  }

  // Conectar con el servidor y recibir respuesta
  if (client.connect(server, port)) {
    Serial.println("Conectado al servidor");

    // Enviar solicitud al backend
    client.println("GET /api/check-access HTTP/1.1");
    client.println("Host: " + String(server));
    client.println("Connection: close");
    client.println();

    // Leer respuesta del servidor
    String response = "";
    while (client.connected() || client.available()) {
      if (client.available()) {
        char c = client.read();
        response += c;
      }
    }

    client.stop();
    Serial.println("Respuesta del servidor:");
    Serial.println(response);

    // Procesar respuesta JSON
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, response);

    if (error) {
      Serial.print("Error al parsear JSON: ");
      Serial.println(error.c_str());
      return;
    }

    bool isValid = doc["isValid"]; // Verifica si el código es válido
    if (isValid) {
      activarServo();
    }
  } else {
    Serial.println("No se pudo conectar al servidor");
  }

  delay(1000); // Esperar antes de volver a intentar
}

void activarServo() {
  Serial.println("Activando servo...");
  servoMotor.write(90); // Mover el servo a la posición de acceso
  delay(2000);          // Esperar 2 segundos
  servoMotor.write(0);  // Volver a la posición inicial
  Serial.println("Servo desactivado");
}
