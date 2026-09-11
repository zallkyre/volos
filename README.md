<div align="center">

# volos

**python library for the volos hardware deck.**
tangible code. instant execution. no drivers.

</div>

---

## what is volos

volos is a hardware platform: a base deck with magnetic snap-in modules
(oled display, keypad, temp sensor). this library is the python side —
plug the deck in, `import volos`, and the modules register as native
objects in your code.

```python
import volos

v = volos.connect()
v.read()                     # deck status: modules, temp, battery
v.display.write("hello")     # oled display module
if v.button.pressed():       # keypad module
    print("click")
print(v.sensor.temp())       # temp sensor module
```

## install

```bash
pip install volos            # core (simulator included)
pip install volos[ble]       # + real hardware over bluetooth (bleak)
```

## no hardware? no problem.

`volos.connect()` with no arguments runs the **built-in simulator** —
the full API works out of the box, so you can develop and demo before
the deck arrives.

```python
import volos

v = volos.connect()          # auto: real deck if address given, else sim
v.display.write("hello")     # sim prints to the console
```

sim-only extras for testing:

```python
v._transport.press_button()  # simulate a key press
v._transport.set_temp(31.2)  # override the sensor reading
v._transport.last_display    # text currently on the sim display
```

## real hardware

```python
import volos

v = volos.connect(transport="ble", address="AA:BB:CC:DD:EE:FF")
```

the deck exposes one BLE service (see `volos/protocol.py`):

| uuid | purpose |
|------|---------|
| `f0000000-0451-4000-b000-000000000000` | service |
| `f0000001-0451-4000-b000-000000000000` | write (python -> deck) |
| `f0000002-0451-4000-b000-000000000000` | read / notify (deck -> python) |

messages are single-line JSON: `{"m": "display", "c": "write", "d": "hello"}`

## firmware

the ESP32 deck firmware lives in `firmware/` (PlatformIO project).
it implements the volos BLE service — oled display, button (GPIO 0),
and the ESP32 internal temperature sensor.

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

## examples

```bash
python examples/base.py
python examples/display.py
python examples/button.py
python examples/sensor.py
```

## tests

```bash
python tests/test_volos.py
```

## license

MIT