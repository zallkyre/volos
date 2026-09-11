// ============================================================
//  volos deck firmware (ESP32)
//  speaks the volos BLE protocol (see volos/protocol.py):
//
//    Service  f0000000-0451-4000-b000-000000000000
//    Write    f0000001-0451-4000-b000-000000000000  python -> deck
//    Read     f0000002-0451-4000-b000-000000000000  deck -> python (notify)
//
//  messages are single-line JSON:
//    {"m":"display","c":"write","d":"hello"}   -> oled
//    {"m":"deck","c":"read"}                   -> status reply
//    {"m":"button","c":"pressed"}              -> one-shot reply
//    {"m":"sensor","c":"temp"}                 -> reply
//
//  modules:
//    display  SSD1306 128x64 oled over i2c (pins 21/22)
//    button   GPIO 0 (built-in boot button on most dev boards)
//    sensor   ESP32 internal temperature sensor (no extra hardware)
// ============================================================

#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <ArduinoJson.h>
#include <U8g2lib.h>
#include <Wire.h>

// ---- volos BLE service (must match volos/protocol.py) ----
#define VOLOS_SERVICE_UUID "f0000000-0451-4000-b000-000000000000"
#define VOLOS_WRITE_UUID   "f0000001-0451-4000-b000-000000000000"
#define VOLOS_READ_UUID    "f0000002-0451-4000-b000-000000000000"

// ---- hardware ----
#define BUTTON_PIN 0  // built-in boot button on common esp32 dev boards

U8G2_SSD1306_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE);
BLECharacteristic *volosReadChar = nullptr;
bool connected = false;
volatile bool buttonPressed = false;

// ------------------------------------------------------------
// display
// ------------------------------------------------------------
void updateScreen(const char *header, const char *line1, const char *line2) {
    u8g2.clearBuffer();
    u8g2.setFont(u8g2_font_6x10_tf);
    u8g2.drawStr(0, 12, header);
    u8g2.drawHLine(0, 16, 128);
    u8g2.drawStr(0, 36, line1);
    u8g2.drawStr(0, 52, line2);
    u8g2.sendBuffer();
}

// ------------------------------------------------------------
// replies to python
// ------------------------------------------------------------
void reply(const char *module, const char *cmd, JsonDocument &data) {
    if (!connected || volosReadChar == nullptr) return;
    JsonDocument doc;
    doc["m"] = module;
    doc["c"] = cmd;
    doc["d"] = data;
    String out;
    serializeJson(doc, out);
    volosReadChar->setValue((uint8_t *)out.c_str(), out.length());
    volosReadChar->notify();
}

void replyBool(const char *module, const char *cmd, bool value) {
    JsonDocument data;
    data.set(value);
    reply(module, cmd, data);
}

void replyFloat(const char *module, const char *cmd, float value) {
    JsonDocument data;
    data.set(value);
    reply(module, cmd, data);
}

void replyStatus() {
    JsonDocument data;
    data["status"] = "ok";
    JsonArray modules = data["modules"].to<JsonArray>();
    modules.add("display");
    modules.add("button");
    modules.add("sensor");
    data["temp"] = temperatureRead();
    data["battery"] = 87;  // placeholder — add a real battery ADC when wired
    reply("deck", "read", data);
}

// ------------------------------------------------------------
// BLE callbacks
// ------------------------------------------------------------
class VolosServerCallbacks : public BLEServerCallbacks {
    void onConnect(BLEServer *server) override {
        connected = true;
        updateScreen("[volos deck]", "status: connected", "python linked.");
    }
    void onDisconnect(BLEServer *server) override {
        connected = false;
        updateScreen("[volos deck]", "status: idle", "waiting for link...");
        BLEDevice::startAdvertising();
    }
};

class VolosWriteCallbacks : public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *characteristic) override {
        std::string value = characteristic->getValue();
        if (value.empty()) return;

        JsonDocument doc;
        if (deserializeJson(doc, value.c_str())) return;  // garbage frame, ignore

        const char *m = doc["m"] | "";
        const char *c = doc["c"] | "";

        if (strcmp(m, "display") == 0 && strcmp(c, "write") == 0) {
            const char *text = doc["d"] | "";
            updateScreen("[volos deck]", text, "");
            return;  // fire-and-forget, no reply
        }
        if (strcmp(m, "deck") == 0 && strcmp(c, "read") == 0) {
            replyStatus();
            return;
        }
        if (strcmp(m, "button") == 0 && strcmp(c, "pressed") == 0) {
            bool pressed = buttonPressed;
            buttonPressed = false;  // one-shot, matches the python library
            replyBool("button", "pressed", pressed);
            return;
        }
        if (strcmp(m, "sensor") == 0 && strcmp(c, "temp") == 0) {
            replyFloat("sensor", "temp", temperatureRead());
            return;
        }
    }
};

// ------------------------------------------------------------
// button
// ------------------------------------------------------------
void IRAM_ATTR buttonISR() {
    buttonPressed = true;
}

// ------------------------------------------------------------
// setup / loop
// ------------------------------------------------------------
void setup() {
    Serial.begin(115200);

    pinMode(BUTTON_PIN, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(BUTTON_PIN), buttonISR, FALLING);

    u8g2.begin();
    updateScreen("[volos deck]", "booting system...", "starting ble...");

    BLEDevice::init("volos deck");
    BLEServer *server = BLEDevice::createServer();
    server->setCallbacks(new VolosServerCallbacks());

    BLEService *service = server->createService(VOLOS_SERVICE_UUID);

    BLECharacteristic *writeChar = service->createCharacteristic(
        VOLOS_WRITE_UUID,
        BLECharacteristic::PROPERTY_WRITE);
    writeChar->setCallbacks(new VolosWriteCallbacks());

    volosReadChar = service->createCharacteristic(
        VOLOS_READ_UUID,
        BLECharacteristic::PROPERTY_NOTIFY);
    volosReadChar->addDescriptor(new BLE2902());

    service->start();

    BLEAdvertising *advertising = BLEDevice::getAdvertising();
    advertising->addServiceUUID(VOLOS_SERVICE_UUID);
    advertising->setScanResponse(true);
    BLEDevice::startAdvertising();

    updateScreen("[volos deck]", "status: idle", "waiting for link...");
    Serial.println("[!] volos deck ready. waiting for python...");
}

void loop() {
    delay(10);
}