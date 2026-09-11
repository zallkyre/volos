"""the volos deck — the object `volos.connect()` returns."""

from __future__ import annotations

from . import protocol as p
from .modules import Button, Display, Sensor


class Deck:
    """a connected volos base deck with its snap-in modules.

    Modules are exposed as attributes and register the moment they
    snap in (hot-swap): v.display, v.button, v.sensor.
    """

    def __init__(self, transport):
        self._transport = transport
        self.display = Display(self)
        self.button = Button(self)
        self.sensor = Sensor(self)

    def read(self) -> dict:
        """base deck status snapshot: modules attached, temp, battery."""
        resp = self._transport.request({"m": p.MODULE_DECK, "c": p.CMD_READ})
        return resp.get("d", {})

    def close(self) -> None:
        """disconnect from the deck."""
        self._transport.disconnect()

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()
        return False

    def __repr__(self) -> str:
        return f"<volos.Deck transport={self._transport.name}>"