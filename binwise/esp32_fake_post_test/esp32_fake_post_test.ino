#include <WiFi.h>
#include <HTTPClient.h>

// Replace with your actual Wi-Fi network credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Replace YOUR_LAPTOP_IP with the IPv4 address from 'ipconfig' (e.g., 192.168.1.15)
// IMPORTANT: Keep the http:// and the :8001/api/readings parts
const char* serverUrl = "http://192.168.239.1:8001/api/readings";

// Fake data variables to mutate
int fill_percentage = 20;
float temperature_c = 28.0;

unsigned long previousMillis = 0;
const long interval = 5000; // Send data every 5 seconds

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("========================================");
  Serial.println("Starting ESP32 Fake POST Test...");
  Serial.println("========================================");

  // Start Wi-Fi connection
  WiFi.begin(ssid, password);
  Serial.print("Connecting to Wi-Fi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("Wi-Fi connected successfully!");
  Serial.print("ESP32 IP Address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  unsigned long currentMillis = millis();

  // Handle Wi-Fi disconnection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi connection lost. Reconnecting...");
    WiFi.disconnect();
    WiFi.reconnect();
    delay(5000);
    return;
  }

  // Send fake data every 5 seconds
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;

    // Mutate the fake data predictably for testing
    // This will simulate the bin filling up and getting hotter over time
    fill_percentage += 15;
    if (fill_percentage > 100) {
      fill_percentage = 20; // Reset
    }

    temperature_c += 8.5;
    if (temperature_c > 75.0) {
      temperature_c = 28.0; // Reset
    }

    // Construct the JSON payload manually
    String jsonPayload = "{";
    jsonPayload += "\"bin_id\":\"BIN-ESP32-001\",";
    jsonPayload += "\"location\":\"ESP32 Test Bin\",";
    jsonPayload += "\"distance_cm\":24,";
    jsonPayload += "\"fill_percentage\":" + String(fill_percentage) + ",";
    jsonPayload += "\"temperature_c\":" + String(temperature_c);
    jsonPayload += "}";

    Serial.println("\n----------------------------------------");
    Serial.println("Sending HTTP POST to: " + String(serverUrl));
    Serial.println("Payload: " + jsonPayload);

    // Initialize HTTP client
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    // Send POST request
    int httpResponseCode = http.POST(jsonPayload);

    // Print result
    if (httpResponseCode > 0) {
      Serial.print("HTTP Response Code: ");
      Serial.println(httpResponseCode);
      String response = http.getString();
      Serial.println("Server Response Body:");
      Serial.println(response);
    } else {
      Serial.print("HTTP Error code: ");
      Serial.println(httpResponseCode);
      Serial.println("Check: Is YOUR_LAPTOP_IP correct? Is FastAPI running on 0.0.0.0?");
    }

    // Free resources
    http.end();
  }
}
