"""volos hardware modules — the objects your code touches.

Each module maps 1:1 to a physical snap-in module on the deck.
The API matches the volos website examples exactly:

    v.display.write("hello")
    if v.button.pressed(): ...
    print(v.sensor.temp())
"""

from __future__ import annotations

from . import protocol as p


class Display:
    """oled display module."""

    def __init__(self, deck):
        self._deck = deck

    def write(self, text: str) -> None:
        """show text on the physical display."""
        self._deck._transport.send(
            {"m": p.MODULE_DISPLAY, "c": p.CMD_WRITE, "d": str(text)}
        )


class Button:
    """keypad module."""

    def __init__(self, deck):
        self._deck = deck

    def pressed(self) -> bool:
        """True if a key was pressed since the last check (one-shot)."""
        resp = self._deck._transport.request(
            {"m": p.MODULE_BUTTON, "c": p.CMD_PRESSED}
        )
        return bool(resp.get("d", False))


class Sensor:
    """temperature sensor module."""

    def __init__(self, deck):
        self._deck = deck

    def temp(self) -> float:
        """current temperature in celsius."""
        resp = self._deck._transport.request(
            {"m": p.MODULE_SENSOR, "c": p.CMD_TEMP}
        )
        return float(resp.get("d", 0.0))