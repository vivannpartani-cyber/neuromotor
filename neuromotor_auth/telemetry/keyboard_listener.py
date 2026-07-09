"""
neuromotor_auth/telemetry/keyboard_listener.py
================================================
Low-level, non-blocking keyboard telemetry daemon.

Design constraints:
  - Runs exclusively in a daemon thread -- never blocks the OS input queue.
  - Discards key identity immediately; stores ONLY timing deltas.
  - Handles key-overlap (rollover) gracefully via per-key press timestamps.
  - Computes:
      * Dwell Time  = keyup_ts - keydown_ts  (for the same key)
      * Flight Time = keydown_ts[N] - keyup_ts[N-1]  (transition latency)

Privacy contract:
  The `key` argument received from pynput is inspected ONLY to determine
  a privacy-safe category index (0-4). The raw Key object is then
  immediately discarded and NEVER written to disk or the buffer.

Category mapping (key_index):
  0 = alpha (a-z, A-Z)
  1 = digit (0-9)
  2 = punctuation / symbol
  3 = special (space, enter, backspace, tab, escape, arrow keys)
  4 = modifier (shift, ctrl, alt, cmd, fn)
"""

from __future__ import annotations

import logging
import threading
import time
from typing import Dict, Optional

try:
    from pynput import keyboard as pynput_kb
except ImportError as exc:
    raise ImportError(
        "pynput is required for keyboard telemetry. "
        "Install with: pip install pynput"
    ) from exc

from neuromotor_auth.telemetry.buffer import KeyEvent, TelemetryBuffer

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Key categorisation (privacy-preserving)
# ---------------------------------------------------------------------------

def _categorise_key(key: pynput_kb.Key | pynput_kb.KeyCode) -> int:
    """
    Map a pynput key object to a privacy-safe integer category.
    The raw character value is NEVER returned or stored.

    Returns
    -------
    int : 0=alpha, 1=digit, 2=punct, 3=special, 4=modifier
    """
    # Modifier keys
    modifier_keys = {
        pynput_kb.Key.shift, pynput_kb.Key.shift_r,
        pynput_kb.Key.ctrl,  pynput_kb.Key.ctrl_r,
        pynput_kb.Key.alt,   pynput_kb.Key.alt_r,
        pynput_kb.Key.cmd,   pynput_kb.Key.cmd_r,
    }
    # Special / navigation keys
    special_keys = {
        pynput_kb.Key.space,  pynput_kb.Key.enter,
        pynput_kb.Key.backspace, pynput_kb.Key.tab,
        pynput_kb.Key.esc,
        pynput_kb.Key.up,   pynput_kb.Key.down,
        pynput_kb.Key.left, pynput_kb.Key.right,
        pynput_kb.Key.delete, pynput_kb.Key.home,
        pynput_kb.Key.end,  pynput_kb.Key.page_up,
        pynput_kb.Key.page_down,
    }

    if key in modifier_keys:
        return 4
    if key in special_keys:
        return 3

    # KeyCode (printable character)
    if hasattr(key, "char") and key.char is not None:
        ch = key.char
        if ch.isalpha():
            return 0
        if ch.isdigit():
            return 1
        return 2  # punctuation / symbol

    # Unknown special key (F1-F12 etc.)
    return 3


# ---------------------------------------------------------------------------
# Keyboard listener daemon
# ---------------------------------------------------------------------------

class KeyboardTelemetryDaemon:
    """
    Spawns a daemon thread that hosts a pynput global keyboard listener.

    The listener calculates Dwell Time and Flight Time from raw timestamp
    differences and writes KeyEvent records (no raw text) into the shared
    TelemetryBuffer.

    Parameters
    ----------
    buffer : TelemetryBuffer
        Shared buffer into which KeyEvent objects are pushed.
    """

    def __init__(self, buffer: TelemetryBuffer) -> None:
        self._buffer = buffer

        # Per-key press timestamp registry: {pynput_key_vk: press_time_ns}
        # Using virtual-key code (an int) avoids storing any character data.
        self._press_times: Dict[int, float] = {}

        # Timestamp of the last key-RELEASE event (for flight time calculation)
        self._last_release_time: Optional[float] = None

        # Internal state lock (separate from buffer lock)
        self._state_lock = threading.Lock()

        self._listener: Optional[pynput_kb.Listener] = None
        self._thread: Optional[threading.Thread] = None
        self._running = False

    # ------------------------------------------------------------------
    # pynput callbacks
    # ------------------------------------------------------------------

    def _on_press(self, key: pynput_kb.Key | pynput_kb.KeyCode) -> None:
        """
        Called by pynput on every key-down event.

        Records the press timestamp keyed by virtual key code.
        Does NOT store or log the character value.
        """
        try:
            press_ts = time.perf_counter() * 1000.0  # ms
            vk = self._get_vk(key)

            with self._state_lock:
                self._press_times[vk] = press_ts
        except Exception:
            # Swallow all errors to prevent crashing the listener thread
            logger.debug("KeyboardDaemon: error in _on_press", exc_info=True)

    def _on_release(self, key: pynput_kb.Key | pynput_kb.KeyCode) -> None:
        """
        Called by pynput on every key-up event.

        Computes:
          dwell_ms  = release_ts - press_ts  (for this key)
          flight_ms = press_ts_this - release_ts_previous

        Pushes a KeyEvent to the shared buffer. Raw key is discarded.
        """
        try:
            release_ts = time.perf_counter() * 1000.0  # ms
            vk = self._get_vk(key)
            key_index = _categorise_key(key)

            with self._state_lock:
                press_ts = self._press_times.pop(vk, None)

                if press_ts is None:
                    # Key released without a matching press (window focus change etc.)
                    return

                dwell_ms = release_ts - press_ts

                # Flight time: time between previous key-up and this key-down
                if self._last_release_time is not None:
                    # press_ts is when THIS key went down (stored at _on_press)
                    flight_ms = press_ts - self._last_release_time
                else:
                    # First keystroke — no previous release to measure against
                    flight_ms = 0.0

                self._last_release_time = release_ts

            # Sanity-bound: reject physiologically impossible values
            # (e.g., event reordering on heavily loaded systems)
            if dwell_ms < 0:
                dwell_ms = 0.0
            if dwell_ms > 2000:
                # >2 second hold: likely a held modifier; clip, don't discard
                dwell_ms = 2000.0

            event = KeyEvent(
                dwell_ms=round(dwell_ms, 3),
                flight_ms=round(flight_ms, 3),
                key_index=key_index,
            )
            self._buffer.push_key(event)

        except Exception:
            logger.debug("KeyboardDaemon: error in _on_release", exc_info=True)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _get_vk(key: pynput_kb.Key | pynput_kb.KeyCode) -> int:
        """
        Extract a stable integer identifier for the key WITHOUT using
        the printable character value.

        pynput KeyCode has a `.vk` attribute (virtual key code).
        pynput Key enum values use `key.value.vk`.
        Falls back to hash(key) for edge cases.
        """
        try:
            if hasattr(key, "vk") and key.vk is not None:
                return int(key.vk)
            if hasattr(key, "value") and hasattr(key.value, "vk"):
                return int(key.value.vk)
        except (AttributeError, TypeError):
            pass
        return hash(key)

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def start(self) -> None:
        """Start the keyboard listener on a background daemon thread."""
        if self._running:
            logger.warning("KeyboardDaemon already running — ignoring start()")
            return

        self._running = True

        # pynput Listener is itself thread-based; we wrap it in our own
        # daemon thread so the process can exit cleanly even if the
        # listener is still blocked.
        self._thread = threading.Thread(
            target=self._run_listener,
            name="neuromotor-kb-daemon",
            daemon=True,  # dies when main process exits
        )
        self._thread.start()
        logger.info("KeyboardDaemon started (thread: %s)", self._thread.name)

    def stop(self) -> None:
        """Gracefully stop the keyboard listener."""
        self._running = False
        if self._listener is not None:
            self._listener.stop()
        if self._thread is not None:
            self._thread.join(timeout=2.0)
        logger.info("KeyboardDaemon stopped")

    def _run_listener(self) -> None:
        """Target function for the daemon thread."""
        try:
            with pynput_kb.Listener(
                on_press=self._on_press,
                on_release=self._on_release,
                suppress=False,     # CRITICAL: never consume events from the OS
            ) as listener:
                self._listener = listener
                listener.join()     # blocks this daemon thread only
        except Exception:
            logger.exception("KeyboardDaemon: unhandled exception in listener thread")
