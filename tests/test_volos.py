"""volos library tests — run with:  python tests/test_volos.py"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import volos

passed = 0


def check(label, cond):
    global passed
    assert cond, f"FAIL: {label}"
    passed += 1
    print(f"  ok  {label}")


print("== volos tests (simulator mode) ==")

# 1. connect returns a deck
v = volos.connect(transport="sim")
check("connect() returns Deck", isinstance(v, volos.Deck))
check("deck repr shows transport", "sim" in repr(v))

# 2. base read
status = v.read()
check("read() returns dict", isinstance(status, dict))
check("read() reports modules", "display" in status["modules"])
check("read() reports battery", status["battery"] == 87)

# 3. display.write
v.display.write("hello")
check("display.write stores text", v._transport.last_display == "hello")
v.display.write("world")
check("display.write overwrites", v._transport.last_display == "world")

# 4. button.pressed — one-shot
check("button not pressed initially", v.button.pressed() is False)
v._transport.press_button()
check("button pressed after sim press", v.button.pressed() is True)
check("button press is one-shot", v.button.pressed() is False)

# 5. sensor.temp
check("sensor.temp returns float", isinstance(v.sensor.temp(), float))
v._transport.set_temp(31.2)
check("sensor.temp reflects sim override", v.sensor.temp() == 31.2)

# 6. context manager
with volos.connect(transport="sim") as d:
    check("context manager works", d.read()["status"] == "ok")

# 7. auto mode without address falls back to sim
v2 = volos.connect()  # no address -> sim
check("auto mode falls back to sim", v2._transport.name == "sim")

# 8. unknown transport raises
try:
    volos.connect(transport="nope")
    check("unknown transport raises", False)
except ValueError:
    check("unknown transport raises", True)

# 9. protocol round-trip
from volos import protocol as p

wire = p.encode({"m": "display", "c": "write", "d": "hi"})
check("protocol encode/decode round-trip", p.decode(wire)["d"] == "hi")

# 10. not-connected error
from volos.transport import SimTransport, TransportError

t = SimTransport()
try:
    t.request({"m": "deck", "c": "read"})
    check("disconnected transport raises", False)
except TransportError:
    check("disconnected transport raises", True)

print(f"\n{passed} checks passed.")