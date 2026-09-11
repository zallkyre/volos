"""volos BLE protocol — the wire format between python and the deck.

The deck exposes one BLE service with two characteristics:

    Service  f0000000-0451-4000-b000-000000000000
    Write    f0000001-0451-4000-b000-000000000000  (python -> deck)
    Read     f0000002-0451-4000-b000-000000000000  (deck -> python, notify)

Messages are single-line JSON:

    to deck:    {"m": "display", "c": "write", "d": "hello"}
    from deck:  {"m": "button",  "c": "pressed", "d": true}

`m` is the module, `c` is the command, `d` is the data.
"""

SERVICE_UUID = "f0000000-0451-4000-b000-000000000000"
WRITE_CHAR_UUID = "f0000001-0451-4000-b000-000000000000"
READ_CHAR_UUID = "f0000002-0451-4000-b000-000000000000"

# module names used on the wire
MODULE_DECK = "deck"
MODULE_DISPLAY = "display"
MODULE_BUTTON = "button"
MODULE_SENSOR = "sensor"

# commands
CMD_READ = "read"
CMD_WRITE = "write"
CMD_PRESSED = "pressed"
CMD_TEMP = "temp"


def encode(msg: dict) -> bytes:
    """dict -> wire bytes (JSON + newline)."""
    import json

    return (json.dumps(msg) + "\n").encode("utf-8")


def decode(data: bytes) -> dict:
    """wire bytes -> dict. tolerant of trailing newlines."""
    import json

    return json.loads(data.decode("utf-8").strip())