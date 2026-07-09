"""
neuromotor_auth/telemetry/buffer.py
=====================================
Thread-safe, bounded rolling buffers for keystroke and mouse telemetry.

Privacy guarantee: This module stores ONLY timing deltas and coordinate
velocities — never raw key characters or passwords. The actual key
values are discarded immediately upon receipt.

Data structures:
  KeyEvent      – named tuple: (dwell_ms, flight_ms)
  MouseEvent    – named tuple: (speed_px_per_ms, accel_px_per_ms2, click_duration_ms)
  TelemetryBuffer – thread-safe deque wrapper, shared between the two listeners.
"""

from __future__ import annotations

import threading
from collections import deque
from dataclasses import dataclass, field
from typing import Deque, Optional


# ---------------------------------------------------------------------------
# Typed event containers (no raw character data ever stored here)
# ---------------------------------------------------------------------------

@dataclass(frozen=True, slots=True)
class KeyEvent:
    """
    Encodes the neuromotor timing signature of a single keystroke pair.

    Attributes
    ----------
    dwell_ms : float
        Key-Down -> Key-Up interval for a single key, in milliseconds.
        Reflects finger muscle hold duration.
    flight_ms : float
        Key-Up (previous key) -> Key-Down (next key) interval, in milliseconds.
        Reflects transition speed between keystrokes. Negative values are
        valid (key overlap / rollover) and carry diagnostic signal.
    key_index : int
        A privacy-safe positional label (0=alpha, 1=digit, 2=punct, 3=special,
        4=modifier). Never stores the actual character.
    """
    dwell_ms: float
    flight_ms: float
    key_index: int  # categorised, NOT the raw character


@dataclass(frozen=True, slots=True)
class MouseEvent:
    """
    Encodes a single mouse movement or click segment.

    Attributes
    ----------
    speed_px_per_ms : float
        Instantaneous cursor speed (Euclidean distance / delta_t).
    accel_px_per_ms2 : float
        Rate of change of speed between consecutive move samples.
    click_duration_ms : float
        Button-Down -> Button-Up duration. 0.0 for pure move events.
    dx : float
        Signed horizontal displacement in pixels.
    dy : float
        Signed vertical displacement in pixels.
    """
    speed_px_per_ms: float
    accel_px_per_ms2: float
    click_duration_ms: float
    dx: float
    dy: float


# ---------------------------------------------------------------------------
# Thread-safe rolling buffer
# ---------------------------------------------------------------------------

class TelemetryBuffer:
    """
    A thread-safe, bounded sliding-window buffer that stores the most
    recent `maxlen` telemetry events (key or mouse).

    The internal ``collections.deque(maxlen=N)`` provides O(1) append
    and O(1) left-eviction so the buffer never grows beyond `maxlen`,
    satisfying the zero-memory-leak constraint.

    Parameters
    ----------
    maxlen : int
        Maximum number of events to retain (default 200 -- 100 key + 100 mouse).
    """

    def __init__(self, maxlen: int = 200) -> None:
        self._lock: threading.Lock = threading.Lock()
        self._key_buf: Deque[KeyEvent] = deque(maxlen=maxlen)
        self._mouse_buf: Deque[MouseEvent] = deque(maxlen=maxlen)

    # ------------------------------------------------------------------
    # Write methods (called from daemon listener threads)
    # ------------------------------------------------------------------

    def push_key(self, event: KeyEvent) -> None:
        """Append a KeyEvent; old events are silently dropped when full."""
        with self._lock:
            self._key_buf.append(event)

    def push_mouse(self, event: MouseEvent) -> None:
        """Append a MouseEvent; old events are silently dropped when full."""
        with self._lock:
            self._mouse_buf.append(event)

    # ------------------------------------------------------------------
    # Read methods (called from the feature-engineering thread)
    # ------------------------------------------------------------------

    def snapshot_keys(self) -> list[KeyEvent]:
        """Return a stable copy of all current KeyEvents (thread-safe)."""
        with self._lock:
            return list(self._key_buf)

    def snapshot_mouse(self) -> list[MouseEvent]:
        """Return a stable copy of all current MouseEvents (thread-safe)."""
        with self._lock:
            return list(self._mouse_buf)

    # ------------------------------------------------------------------
    # Diagnostics
    # ------------------------------------------------------------------

    @property
    def key_count(self) -> int:
        with self._lock:
            return len(self._key_buf)

    @property
    def mouse_count(self) -> int:
        with self._lock:
            return len(self._mouse_buf)

    def clear(self) -> None:
        """Flush both buffers -- used between training epochs."""
        with self._lock:
            self._key_buf.clear()
            self._mouse_buf.clear()

    def __repr__(self) -> str:
        return (
            f"TelemetryBuffer("
            f"keys={self.key_count}/{self._key_buf.maxlen}, "
            f"mouse={self.mouse_count}/{self._mouse_buf.maxlen})"
        )
