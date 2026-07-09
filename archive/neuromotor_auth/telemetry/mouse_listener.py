"""
neuromotor_auth/telemetry/mouse_listener.py
============================================
Low-level, non-blocking mouse telemetry daemon.

Design constraints:
  - Runs exclusively in a daemon thread -- never blocks the OS input queue.
  - Computes kinematic features from raw (x, y, t) samples:
      * Speed      = Euclidean_distance(P1, P2) / delta_t
      * Acceleration = (speed[N] - speed[N-1]) / delta_t
      * Click Duration = button_up_ts - button_down_ts
  - Does NOT store absolute cursor coordinates -- only delta values (dx, dy).
  - Mouse path curvature and direction changes are embedded implicitly via
    consecutive dx/dy pairs fed to the feature pipeline.

Privacy contract:
  Absolute screen coordinates are used ONLY for delta computation and are
  then immediately discarded. The buffer stores only (dx, dy, speed, accel).
"""

from __future__ import annotations

import logging
import math
import threading
import time
from typing import Dict, Optional, Tuple

try:
    from pynput import mouse as pynput_mouse
except ImportError as exc:
    raise ImportError(
        "pynput is required for mouse telemetry. "
        "Install with: pip install pynput"
    ) from exc

from neuromotor_auth.telemetry.buffer import MouseEvent, TelemetryBuffer

logger = logging.getLogger(__name__)

# Minimum time delta (ms) to avoid division-by-zero in speed calculation
_MIN_DT_MS: float = 0.5


class MouseTelemetryDaemon:
    """
    Spawns a daemon thread that hosts a pynput global mouse listener.

    Calculates instantaneous speed, acceleration, and click duration from
    raw pointer events and writes MouseEvent records into the shared
    TelemetryBuffer.

    Parameters
    ----------
    buffer : TelemetryBuffer
        Shared buffer into which MouseEvent objects are pushed.
    move_sample_interval_ms : float
        Minimum time (ms) between consecutive move events pushed to the
        buffer. Acts as a low-pass filter on mousemove spam (default 16 ms
        ~ 60 Hz).
    """

    def __init__(
        self,
        buffer: TelemetryBuffer,
        move_sample_interval_ms: float = 16.0,
    ) -> None:
        self._buffer = buffer
        self._sample_interval_ms = move_sample_interval_ms

        # Previous move sample state
        self._prev_x: Optional[float] = None
        self._prev_y: Optional[float] = None
        self._prev_ts: Optional[float] = None       # ms
        self._prev_speed: Optional[float] = None    # px/ms

        # Click timing: {button_name: press_time_ms}
        self._click_press_times: Dict[str, float] = {}

        self._state_lock = threading.Lock()

        # Throttle: track when we last pushed a move event
        self._last_move_push_ts: float = 0.0

        self._listener: Optional[pynput_mouse.Listener] = None
        self._thread: Optional[threading.Thread] = None
        self._running = False

    # ------------------------------------------------------------------
    # pynput callbacks
    # ------------------------------------------------------------------

    def _on_move(self, x: int, y: int) -> None:
        """
        Called on every mouse-move event by pynput.

        Computes speed and acceleration from positional deltas.
        Absolute (x, y) is used only transiently for delta computation.
        """
        try:
            now_ms = time.perf_counter() * 1000.0

            with self._state_lock:
                if self._prev_x is None:
                    # Bootstrap: store first sample, emit nothing
                    self._prev_x, self._prev_y, self._prev_ts = float(x), float(y), now_ms
                    return

                dt_ms = now_ms - self._prev_ts  # type: ignore[operator]
                if dt_ms < _MIN_DT_MS:
                    # Sub-millisecond jitter: update position but skip push
                    self._prev_x, self._prev_y, self._prev_ts = float(x), float(y), now_ms
                    return

                # Throttle to move_sample_interval_ms
                if (now_ms - self._last_move_push_ts) < self._sample_interval_ms:
                    return

                dx = float(x) - self._prev_x  # type: ignore[operator]
                dy = float(y) - self._prev_y  # type: ignore[operator]
                dist = math.hypot(dx, dy)
                speed = dist / dt_ms  # px/ms

                # Acceleration (px/ms^2)
                if self._prev_speed is not None:
                    accel = (speed - self._prev_speed) / dt_ms
                else:
                    accel = 0.0

                # Update state (absolute coords discarded after delta)
                self._prev_x = float(x)
                self._prev_y = float(y)
                self._prev_ts = now_ms
                self._prev_speed = speed
                self._last_move_push_ts = now_ms

            event = MouseEvent(
                speed_px_per_ms=round(speed, 4),
                accel_px_per_ms2=round(accel, 6),
                click_duration_ms=0.0,
                dx=round(dx, 2),
                dy=round(dy, 2),
            )
            self._buffer.push_mouse(event)

        except Exception:
            logger.debug("MouseDaemon: error in _on_move", exc_info=True)

    def _on_click(
        self,
        x: int,
        y: int,
        button: pynput_mouse.Button,
        pressed: bool,
    ) -> None:
        """
        Called on every mouse button press/release.

        Records click duration (button-down to button-up interval).
        Coordinates are used only to maintain state parity with _on_move;
        they are never stored in the buffer.
        """
        try:
            now_ms = time.perf_counter() * 1000.0
            # Use button name as dict key (a safe string like 'left' / 'right')
            btn_key = button.name  # e.g. "left", "right", "middle"

            if pressed:
                with self._state_lock:
                    self._click_press_times[btn_key] = now_ms
                    # Update position tracking to prevent stale delta on resume
                    self._prev_x = float(x)
                    self._prev_y = float(y)
                    self._prev_ts = now_ms
            else:
                with self._state_lock:
                    press_ts = self._click_press_times.pop(btn_key, None)

                if press_ts is not None:
                    duration_ms = now_ms - press_ts
                    duration_ms = max(0.0, min(duration_ms, 5000.0))  # sanity clip

                    event = MouseEvent(
                        speed_px_per_ms=0.0,
                        accel_px_per_ms2=0.0,
                        click_duration_ms=round(duration_ms, 3),
                        dx=0.0,
                        dy=0.0,
                    )
                    self._buffer.push_mouse(event)

        except Exception:
            logger.debug("MouseDaemon: error in _on_click", exc_info=True)

    def _on_scroll(
        self,
        x: int,
        y: int,
        dx: int,
        dy: int,
    ) -> None:
        """
        Called on scroll wheel events.

        Scroll events contribute to the mouse behavioral fingerprint via
        speed metrics derived from scroll delta magnitude.
        """
        try:
            # Treat scroll as a mini-move: magnitude = scroll wheel ticks
            scroll_magnitude = math.hypot(float(dx), float(dy))

            # We approximate "speed" for scroll as ticks-per-sample
            # (we can't measure dt here, but the magnitude itself is a
            # useful biometric feature -- some users scroll one tick,
            # others scroll three)
            event = MouseEvent(
                speed_px_per_ms=scroll_magnitude,
                accel_px_per_ms2=0.0,
                click_duration_ms=0.0,
                dx=float(dx),
                dy=float(dy),
            )
            self._buffer.push_mouse(event)

        except Exception:
            logger.debug("MouseDaemon: error in _on_scroll", exc_info=True)

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def start(self) -> None:
        """Start the mouse listener on a background daemon thread."""
        if self._running:
            logger.warning("MouseDaemon already running -- ignoring start()")
            return

        self._running = True
        self._thread = threading.Thread(
            target=self._run_listener,
            name="neuromotor-mouse-daemon",
            daemon=True,
        )
        self._thread.start()
        logger.info("MouseDaemon started (thread: %s)", self._thread.name)

    def stop(self) -> None:
        """Gracefully stop the mouse listener."""
        self._running = False
        if self._listener is not None:
            self._listener.stop()
        if self._thread is not None:
            self._thread.join(timeout=2.0)
        logger.info("MouseDaemon stopped")

    def _run_listener(self) -> None:
        """Target function for the daemon thread."""
        try:
            with pynput_mouse.Listener(
                on_move=self._on_move,
                on_click=self._on_click,
                on_scroll=self._on_scroll,
                suppress=False,     # CRITICAL: never consume events from the OS
            ) as listener:
                self._listener = listener
                listener.join()
        except Exception:
            logger.exception("MouseDaemon: unhandled exception in listener thread")
