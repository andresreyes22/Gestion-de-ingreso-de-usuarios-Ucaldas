#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>  

// Configuración de la red Wi-Fi
const char* ssid = "Teo1";              // Nombre de tu red Wi-Fi
const char* password = "12345678";      // Contraseña de tu red Wi-Fi

// Dirección del servidor y endpoints
const String server = "http://192.168.1.5:3001";
const String lastScanEndpoint = "/api/last-scan";

// Configuración del servo motor
Servo myServo;
const int servoPin = 18;

// Variables para almacenar el último código y timestamp procesado
String lastProcessedCode = "";
String lastProcessedTimestamp = "";  // Para almacenar el último timestamp

void setup() {
  Serial.begin(115200);
  myServo.attach(servoPin);
  myServo.write(0); // Inicializar el servo en posición cerrada

  // Conexión a la red Wi-Fi
  Serial.println("Conectando a Wi-Fi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi conectado.");
  Serial.print("Dirección IP: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    // Consultar el último escaneo
    String response = obtenerUltimoEscaneo();
    if (!response.isEmpty()) {
      procesarEscaneo(response);
    }
  } else {
    Serial.println("Wi-Fi desconectado. Reintentando...");
    WiFi.reconnect();
  }
  delay(5000); // Consultar cada 5 segundos
}

// Función para obtener el último escaneo desde el backend
String obtenerUltimoEscaneo() {
  HTTPClient http;
  String url = server + lastScanEndpoint;
  Serial.println("Conectando a: " + url);

  http.begin(url);
  int httpCode = http.GET(); // Hacer la solicitud GET

  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    Serial.println("Respuesta del servidor: " + payload);
    http.end();
    return payload; // Devolver la respuesta como cadena
  } else {
    Serial.println("Error al conectar con el servidor: " + String(httpCode));
    http.end();
    return "";
  }
}

// Función para procesar el escaneo recibido
void procesarEscaneo(String jsonResponse) {
  // Analizar el JSON recibido
  DynamicJsonDocument doc(1024);
  DeserializationError error = deserializeJson(doc, jsonResponse);

  if (error) {
    Serial.println("Error al analizar JSON: " + String(error.c_str()));
    return;
  }

  // Extraer los datos del JSON
  String scannedCode = doc["data"]["code"];
  bool isValid = doc["data"]["isValid"];
  String timestamp = doc["data"]["timestamp"];

  // Verificar si el código es válido y si el timestamp es diferente al último procesado
  if (isValid && (scannedCode != lastProcessedCode || timestamp != lastProcessedTimestamp)) {
    lastProcessedCode = scannedCode; // Actualizar el último código procesado
    lastProcessedTimestamp = timestamp; // Actualizar el último timestamp procesado
    Serial.println("Código válido recibido: " + scannedCode);
    activarServo();  // Activar el servo
  } else if (!isValid) {
    Serial.println("Código no válido recibido: " + scannedCode);
  } else {
    Serial.println("Escaneo repetido, no se activa el servo.");
  }
}

// Función para activar el servo motor
void activarServo() {
  Serial.println("Activando servo...");
  myServo.write(90);  // Abrir
  delay(5000);         // Mantener abierto por 5 segundos
  myServo.write(0);    // Cerrar
  delay(1000);
}
