<div align="center">

<img src="volos.png" alt="volos" width="120">

# volos

**the open-source stream deck.**

a $25 macropad that beats a $150 elgato. hot-swap keys, snap-on modules, zero-install flashing.

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![python](https://img.shields.io/badge/python-3.9%2B-blue.svg)](pyproject.toml)
[![version](https://img.shields.io/badge/version-0.1.0-blue.svg)](pyproject.toml)
[![discord](https://img.shields.io/badge/discord-join-5865F2.svg)](https://discord.com/invite/juFWb2M4)

</div>

---

## what is volos

volos is an open-source stream deck / macropad built around an **ESP32-S3** hub:

- **hot-swap keys** — kailh mechanical sockets. swap switches and keycaps without soldering.
- **snap-on modules** — rotary encoders, key clusters, faders. magnetic pogo-pin + usb-c expansion, zero wiring.
- **zero-install flashing** — flash firmware from the browser over web serial. no drivers, no ide, no setup.
- **no lock-in** — firmware, python library, and hardware files are MIT. no account, no cloud.

## volos vs elgato

| | volos | elgato stream deck |
|---|---|---|
| price | **$25–40** | $150+ |
| keys | 9–12, hot-swap kailh | fixed membrane |
| expansion | snap-on modules | none |
| software | open source | proprietary |
| flashing | web serial, no install | vendor app |
| lock-in | none — mit license | account + cloud |

the bom is **$12–18**. the base deck sells for **$25–40**.

## deck specs

| spec | value |
|---|---|
| mcu | esp32-s3 |
| key grid | 3×3 (9 keys) or 4×3 (12 keys) |
| switches | kailh hot-swap sockets (cherry-mx compatible) |
| expansion | magnetic pogo-pin + usb-c |
| modules | rotary encoder, key cluster, fader |
| flashing | web serial (browser, no install) |
| bom | $12–18 |
| base price | $25–40 |

## modules

| module | what it does |
|---|---|
| rotary encoder | turn for volume, scrubbing, zoom |
| key cluster | 4 extra keys for macros |
| fader | analog level for audio / lighting |

## repo layout

```
├── index.html          interactive site (stream deck pitch + live simulator)
├── style.css           site styles
├── script.js           site logic — simulator, examples, settings
├── volos/              python library (pip install volos)
│   ├── deck.py         deck object — modules register as native attributes
│   ├── modules.py      display, button, sensor modules
│   ├── protocol.py     wire protocol (single-line json over ble)
│   └── transport.py    ble + built-in simulator transports
├── firmware/           esp32 platformio project
│   └── src/main.cpp    volos ble service — display, button, temp sensor
├── tests/              library tests
└── volos.png           logo
```

## quick start

### 1. try the site

open `index.html` — or run a local server:

```bash
python -m http.server 8765 --directory .
```

the live simulator runs in the browser: press keys, turn the knob, drag the fader.

### 2. install the library

```bash
pip install volos            # core (simulator included)
pip install volos[ble]       # + real hardware over bluetooth (bleak)
```

no hardware? no problem — `volos.connect()` with no arguments runs the built-in simulator:

```python
import volos

v = volos.connect()          # auto: real deck if address given, else sim
v.read()                     # deck status: modules, temp, battery
v.display.write("hello")     # oled display module
if v.button.pressed():       # keypad module
    print("click")
print(v.sensor.temp())       # temp sensor module
```

sim-only extras for testing:

```python
v._transport.press_button()  # simulate a key press
v._transport.set_temp(31.2)  # override the sensor reading
v._transport.last_display    # text currently on the sim display
```

### 3. flash the firmware

```bash
cd firmware
pio run                 # build
pio run -t upload       # flash over usb
```

then find the deck's address and connect:

```python
import volos

v = volos.connect(transport="ble", address="XX:XX:XX:XX:XX:XX")
v.display.write("hello from python")
print(v.sensor.temp())
```

## wire protocol

the deck exposes one BLE service:

| uuid | purpose |
|---|---|
| `f0000000-0451-4000-b000-000000000000` | service |
| `f0000001-0451-4000-b000-000000000000` | write (python -> deck) |
| `f0000002-0451-4000-b000-000000000000` | read / notify (deck -> python) |

messages are single-line JSON:

```json
{"m": "display", "c": "write", "d": "hello"}
{"m": "deck", "c": "read"}
{"m": "button", "c": "pressed"}
{"m": "sensor", "c": "temp"}
```

## roadmap

- [x] esp32 prototype firmware (ble: display, button, temp sensor)
- [x] python library 0.1.0 with simulator
- [x] interactive site with live simulator
- [ ] esp32-s3 stream deck grid (3×3 / 4×3, kailh hot-swap)
- [ ] web serial flashing from the browser
- [ ] snap-on modules: rotary encoder, key cluster, fader
- [ ] curated directory of trusted github tools

## community

- **discord** — [join the server](https://discord.com/invite/juFWb2M4)
- **site** — interactive demo in this repo (`index.html`)

## license

MIT