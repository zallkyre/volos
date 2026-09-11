"""volos — python library for the volos hardware deck.

    import volos

    v = volos.connect()          # auto: real deck over BLE, else simulator
    v.read()                     # deck status snapshot
    v.display.write("hello")     # oled display module
    if v.button.pressed(): ...   # keypad module
    print(v.sensor.temp())       # temp sensor module

No drivers. No setup. Plug in, import, go.
"""

from __future__ import annotations

from .deck import Deck
from .transport import BleTransport, SimTransport, TransportError

__version__ = "0.1.0"
__all__ = ["connect", "Deck", "TransportError", "__version__"]


def connect(transport: str = "auto", address: str | None = None, timeout: float = 5.0) -> Deck:
    """connect to a volos deck.

    transport:
        "auto"  try a real deck over BLE (only if `address` is given),
                otherwise fall back to the built-in simulator.
        "sim"   force the simulator (no hardware needed).
        "ble"   force bluetooth — requires `address` and `pip install volos[ble]`.

    returns a Deck whose modules (display, button, sensor) are ready to use.
    """
    if transport == "sim":
        t = SimTransport()
        t.connect()
        return Deck(t)

    if transport == "ble":
        t = BleTransport(address=address, timeout=timeout)
        t.connect()
        return Deck(t)

    if transport == "auto":
        if address is not None:
            try:
                t = BleTransport(address=address, timeout=timeout)
                t.connect()
                return Deck(t)
            except Exception:
                pass  # fall through to simulator
        t = SimTransport()
        t.connect()
        return Deck(t)

    raise ValueError(f"unknown transport {transport!r} (use 'auto', 'sim' or 'ble')")