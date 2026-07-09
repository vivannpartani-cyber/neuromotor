"""
neuromotor_auth/telemetry/daemon_manager.py
=============================================
Orchestrator for all telemetry daemons.

Provides a single entry point (TelemetryManager) that:
  - Owns the shared TelemetryBuffer
  - Starts / stops the KeyboardTelemetryDaemon and MouseTelemetryDaemon
  - Exposes the buffer for downstream consumers (feature pipeline, UI)
  - Emits periodic diagnostics via Python's logging framework

Usage
-----
    manager = TelemetryManager()
    manager.start()
    ...
    snapshot = manager.buffer.snapshot_keys()
    ...
    manager.stop()
"""

from __future__ import annotations

import logging
import threading
import time
from typing import Optional

from neuromotor_auth.telemetry.buffer import TelemetryBuffer
from neuromotor_auth.telemetry.keyboard_listener import KeyboardTelemetryDaemon
from neuromotor_auth.telemetry.mouse_listener import MouseTelemetryDaemon

logger = logging.getLogger(__name__)


class TelemetryManager:
    """
    High-level orchestrator for all input telemetry daemons.

    Parameters
    ----------
    buffer_maxlen : int
        Maximum events per channel (key/mouse) in the rolling buffer.
    diagnostic_interval_s : float
        How often (seconds) to log buffer statistics. 0 = disabled.
    """

    def __init__(
        self,
        buffer_maxlen: int = 200,
        diagnostic_interval_s: float = 10.0,
    ) -> None:
        self._buffer = TelemetryBuffer(maxlen=buffer_maxlen)
        self._kb_daemon = KeyboardTelemetryDaemon(self._buffer)
        self._mouse_daemon = MouseTelemetryDaemon(self._buffer)
        self._diagnostic_interval = diagnostic_interval_s
        self._diag_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._running = False

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    @property
    def buffer(self) -> TelemetryBuffer:
        """Shared buffer -- read by feature pipeline, written by daemons."""
        return self._buffer

    def start(self) -> None:
        """Launch all telemetry daemons and the diagnostic ticker."""
        if self._running:
            logger.warning("TelemetryManager already running")
            return

        self._running = True
        self._stop_event.clear()

        self._kb_daemon.start()
        self._mouse_daemon.start()

        if self._diagnostic_interval > 0:
            self._diag_thread = threading.Thread(
                target=self._diagnostic_loop,
                name="neuromotor-diagnostics",
                daemon=True,
            )
            self._diag_thread.start()

        logger.info(
            "TelemetryManager started | buffer_maxlen=%d | diag_interval=%.1fs",
            self._buffer._key_buf.maxlen,
            self._diagnostic_interval,
        )

    def stop(self) -> None:
        """Gracefully stop all daemons and the diagnostic ticker."""
        if not self._running:
            return

        self._running = False
        self._stop_event.set()

        self._kb_daemon.stop()
        self._mouse_daemon.stop()

        if self._diag_thread is not None:
            self._diag_thread.join(timeout=3.0)

        logger.info("TelemetryManager stopped | final buffer state: %r", self._buffer)

    # ------------------------------------------------------------------
    # Diagnostic loop
    # ------------------------------------------------------------------

    def _diagnostic_loop(self) -> None:
        """Periodically logs buffer fill levels to aid debugging."""
        while not self._stop_event.wait(timeout=self._diagnostic_interval):
            keys = self._buffer.snapshot_keys()
            mice = self._buffer.snapshot_mouse()

            if keys:
                dwell_vals = [e.dwell_ms for e in keys]
                flight_vals = [e.flight_ms for e in keys]
                avg_dwell = sum(dwell_vals) / len(dwell_vals)
                avg_flight = sum(flight_vals) / len(flight_vals)
                logger.info(
                    "DIAG | keys=%d | avg_dwell=%.1fms | avg_flight=%.1fms",
                    len(keys), avg_dwell, avg_flight,
                )

            if mice:
                speeds = [e.speed_px_per_ms for e in mice if e.speed_px_per_ms > 0]
                avg_speed = sum(speeds) / len(speeds) if speeds else 0.0
                click_events = [e for e in mice if e.click_duration_ms > 0]
                logger.info(
                    "DIAG | mouse_events=%d | avg_speed=%.3fpx/ms | clicks=%d",
                    len(mice), avg_speed, len(click_events),
                )

    # ------------------------------------------------------------------
    # Context manager support
    # ------------------------------------------------------------------

    def __enter__(self) -> "TelemetryManager":
        self.start()
        return self

    def __exit__(self, *_: object) -> None:
        self.stop()
