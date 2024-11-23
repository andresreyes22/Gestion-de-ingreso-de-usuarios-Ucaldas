#include <Servo.h>
#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>

const char* ssid = "YourWiFiSSID";
const char* password = "YourWiFiPassword";

#define SERVO_PIN 9
#define BUTTON_PIN 2

Servo doorServo;
ESP8266WebServer server(80);

void setup() {
  Serial.begin(9600);
  
  // Initialize servo
  doorServo.attach(SERVO_PIN);
  doorServo.write(0); // Initial position (closed)
  
  // Initialize button with internal pull-up
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  // Setup server endpoints
  server.on("/open", HTTP_GET, handleOpen);
  server.begin();
}

void loop() {
  server.handleClient();
  
  // Check for serial commands
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    if (command == "OPEN") {
      openDoor();
    }
  }
  
  // Check button state
  if (digitalRead(BUTTON_PIN) == LOW) {
    Serial.println("BUTTON_PRESSED");
    openDoor();
    delay(500); // Debounce
  }
}

void openDoor() {
  doorServo.write(90); // Open position
  delay(3000);        // Keep open for 3 seconds
  doorServo.write(0);  // Close
}

void handleOpen() {
  openDoor();
  server.send(200, "text/plain", "Door opened");
}