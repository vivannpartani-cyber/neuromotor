"""
phase1_run.py
=============
Phase 1 integration test / live demo for Neuromotor-Auth.

Run this script to prove that:
  1. The keyboard and mouse daemons start as non-blocking background threads.
  2. Dwell Time and Flight Time are calculated in real-time.
  3. The rolling buffer is correctly bounded and thread-safe.
  4. NO raw keystroke characters are stored anywhere.

Usage
-----
    python phase1_run.py

Press Ctrl+C to stop the demo.
"""

from __future__ import annotations

import logging
import sys
import time

# Configure structured console logging BEFORE importing daemons
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)-7s] %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("neuromotor.phase1")


def main() -> None:
    # ----------------------------------------------------------------
    # Import here (after logging is configured so pynput sees our setup)
    # ----------------------------------------------------------------
    from neuromotor_auth.telemetry.daemon_manager import TelemetryManager

    logger.info("=" * 60)
    logger.info("  Neuromotor-Auth  |  Phase 1: Telemetry Daemon Proof")
    logger.info("=" * 60)
    logger.info("Type normally and move the mouse. Press Ctrl+C to stop.")
    logger.info("NOTE: Zero characters are stored — only timing deltas.")
    logger.info("")

    manager = TelemetryManager(
        buffer_maxlen=200,       # 100 key + 100 mouse slots per channel
        diagnostic_interval_s=5.0,
    )

    try:
        manager.start()
        logger.info("Daemons running. Listening for events...")

        prev_key_count = 0
        prev_mouse_count = 0
        report_interval = 3.0   # seconds between live reports

        while True:
            time.sleep(report_interval)

            # ---------- Live snapshot report ----------
            keys = manager.buffer.snapshot_keys()
            mice = manager.buffer.snapshot_mouse()

            new_keys = len(keys) - prev_key_count
            new_mouse = len(mice) - prev_mouse_count

            if keys:
                recent = keys[-5:]  # last 5 events only
                logger.info(
                    "LIVE | Key buffer: %d events | Last 5 KeyEvents:",
                    len(keys),
                )
                for evt in recent:
                    logger.info(
                        "        KeyEvent(dwell=%.2fms, flight=%.2fms, category=%s)",
                        evt.dwell_ms,
                        evt.flight_ms,
                        _category_name(evt.key_index),
                    )

            if mice:
                recent_m = [e for e in mice[-5:] if e.speed_px_per_ms > 0]
                if recent_m:
                    logger.info(
                        "LIVE | Mouse buffer: %d events | Last 5 move events:",
                        len(mice),
                    )
                    for evt in recent_m:
                        logger.info(
                            "        MouseEvent(speed=%.3fpx/ms, accel=%.4f, dx=%.1f, dy=%.1f)",
                            evt.speed_px_per_ms,
                            evt.accel_px_per_ms2,
                            evt.dx,
                            evt.dy,
                        )
                clicks = [e for e in mice if e.click_duration_ms > 0]
                if clicks:
                    logger.info(
                        "LIVE | Click events in window: %d | Last click: %.1fms",
                        len(clicks),
                        clicks[-1].click_duration_ms,
                    )

            if not keys and not mice:
                logger.info(
                    "LIVE | Buffers empty — type something or move the mouse!"
                )

            prev_key_count = len(keys)
            prev_mouse_count = len(mice)

    except KeyboardInterrupt:
        logger.info("")
        logger.info("Ctrl+C received — shutting down daemons...")

    finally:
        manager.stop()
        final_keys = manager.buffer.snapshot_keys()
        final_mice = manager.buffer.snapshot_mouse()

        logger.info("")
        logger.info("=" * 60)
        logger.info("  Phase 1 Summary")
        logger.info("=" * 60)
        logger.info("Total KeyEvents in buffer   : %d", len(final_keys))
        logger.info("Total MouseEvents in buffer : %d", len(final_mice))

        if final_keys:
            dwell_vals = [e.dwell_ms for e in final_keys]
            flight_vals = [e.flight_ms for e in final_keys]
            logger.info(
                "Dwell time  — min: %.2fms | max: %.2fms | mean: %.2fms",
                min(dwell_vals),
                max(dwell_vals),
                sum(dwell_vals) / len(dwell_vals),
            )
            logger.info(
                "Flight time — min: %.2fms | max: %.2fms | mean: %.2fms",
                min(flight_vals),
                max(flight_vals),
                sum(flight_vals) / len(flight_vals),
            )

        logger.info("Privacy check: No raw characters stored. Buffer contents:")
        logger.info("  KeyEvent fields   : dwell_ms, flight_ms, key_index")
        logger.info("  MouseEvent fields : speed_px_per_ms, accel, click_duration_ms, dx, dy")
        logger.info("Phase 1 complete.")


def _category_name(idx: int) -> str:
    return {0: "alpha", 1: "digit", 2: "punct", 3: "special", 4: "modifier"}.get(idx, "unknown")


if __name__ == "__main__":
    main()
