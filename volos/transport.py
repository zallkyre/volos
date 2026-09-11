"""volos transports — how python talks to the deck.

Two transports:

    SimTransport   in-memory simulator. works with zero hardware.
                   perfect for demos, tests, and developing against
                   the API before the deck arrives.

    BleTransport   real hardware over bluetooth low energy (bleak).
                   requires `pip install volos[ble]`.
"""

from __future__ import annotations

import json
import time

from . import protocol as p


class TransportError(RuntimeError):
    """raised when talking to the deck fails."""


class Transport:
    """base class. subclasses implement send/request."""

    name = "base"

    def connect(self) -> None:
        raise NotImplementedError

    def disconnect(self) -> None:
        raise NotImplementedError

    def send(self, msg: dict) -> None:
        """fire-and-forget message to the deck."""
        raise NotImplementedError

    def request(self, msg: dict, timeout: float = 2.0):
        """send a message and wait for the deck's reply."""
        raise NotImplementedError


# ---------------------------------------------------------------------------
# simulator
# ---------------------------------------------------------------------------

class SimTransport(Transport):
    """in-memory deck. deterministic, no hardware needed.

    Extra sim-only helpers (not part of the public volos API):

        sim.press_button()      make button.pressed() return True once
        sim.set_temp(value)     override the sensor reading
        sim.last_display        text currently shown on the sim display
    """

    name = "sim"

    def __init__(self):
        self._connected = False
        self._button_pressed = False
        self._temp = 24.5
        self.last_display = ""
        self._log = []

    # -- transport interface ------------------------------------------------

    def connect(self) -> None:
        self._connected = True

    def disconnect(self) -> None:
        self._connected = False

    def send(self, msg: dict) -> None:
        self._check()
        self._log.append(msg)
        if msg.get("m") == p.MODULE_DISPLAY and msg.get("c") == p.CMD_WRITE:
            self.last_display = str(msg.get("d", ""))

    def request(self, msg: dict, timeout: float = 2.0):
        self._check()
        self._log.append(msg)
        m, c = msg.get("m"), msg.get("c")

        if m == p.MODULE_DECK and c == p.CMD_READ:
            return {
                "m": p.MODULE_DECK,
                "c": p.CMD_READ,
                "d": {
                    "status": "ok",
                    "modules": [p.MODULE_DISPLAY, p.MODULE_BUTTON, p.MODULE_SENSOR],
                    "temp": self._temp,
                    "battery": 87,
                },
            }
        if m == p.MODULE_BUTTON and c == p.CMD_PRESSED:
            d = self._button_pressed
            self._button_pressed = False  # one-shot
            return {"m": p.MODULE_BUTTON, "c": p.CMD_PRESSED, "d": d}
        if m == p.MODULE_SENSOR and c == p.CMD_TEMP:
            return {"m": p.MODULE_SENSOR, "c": p.CMD_TEMP, "d": self._temp}

        return {"m": m, "c": c, "d": None}

    # -- sim-only helpers ----------------------------------------------------

    def press_button(self) -> None:
        self._button_pressed = True

    def set_temp(self, value: float) -> None:
        self._temp = float(value)

    def _check(self) -> None:
        if not self._connected:
            raise TransportError("not connected — call volos.connect() first")


# ---------------------------------------------------------------------------
# bluetooth low energy
# ---------------------------------------------------------------------------

class BleTransport(Transport):
    """real deck over BLE. requires bleak (`pip install volos[ble]`)."""

    name = "ble"

    def __init__(self, address: str | None = None, timeout: float = 5.0):
        self.address = address
        self.timeout = timeout
        self._client = None
        self._pending = []
        self._notify_started = False

    def connect(self) -> None:
        try:
            from bleak import BleakClient
        except ImportError as e:  # pragma: no cover
            raise TransportError(
                "bleak not installed — run `pip install volos[ble]`"
            ) from e

        if self.address is None:
            raise TransportError("no deck address given — pass address= to connect()")

        self._client = BleakClient(self.address, timeout=self.timeout)
        self._client.set_disconnected_callback(self._on_disconnect)

        import asyncio

        try:
            asyncio.get_event_loop().run_until_complete(self._client.connect())
        except RuntimeError:
            asyncio.new_event_loop().run_until_complete(self._client.connect())

        asyncio.get_event_loop().run_until_complete(
            self._client.start_notify(p.READ_CHAR_UUID, self._on_notify)
        )
        self._notify_started = True

    def disconnect(self) -> None:
        if self._client is None:
            return
        import asyncio

        if self._notify_started:
            asyncio.get_event_loop().run_until_complete(
                self._client.stop_notify(p.READ_CHAR_UUID)
            )
        asyncio.get_event_loop().run_until_complete(self._client.disconnect())
        self._client = None

    def send(self, msg: dict) -> None:
        if self._client is None:
            raise TransportError("not connected")
        import asyncio

        asyncio.get_event_loop().run_until_complete(
            self._client.write_gatt_char(p.WRITE_CHAR_UUID, p.encode(msg))
        )

    def request(self, msg: dict, timeout: float = 2.0):
        self._pending.clear()
        self.send(msg)
        deadline = time.time() + timeout
        while time.time() < deadline:
            if self._pending:
                return self._pending.pop(0)
            time.sleep(0.02)
        raise TransportError(f"no reply from deck for {msg!r}")

    def _on_notify(self, _char, data: bytearray) -> None:
        try:
            self._pending.append(p.decode(bytes(data)))
        except json.JSONDecodeError:
            pass  # ignore garbage frames

    def _on_disconnect(self, _client) -> None:  # pragma: no cover
        self._client = None