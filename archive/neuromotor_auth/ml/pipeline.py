import numpy as np
import pandas as pd
from typing import List, Tuple, Dict
import logging

from neuromotor_auth.telemetry.buffer import TelemetryBuffer, KeyEvent, MouseEvent

logger = logging.getLogger(__name__)

def extract_features(buffer: TelemetryBuffer) -> pd.DataFrame:
    """
    Extracts statistical features from the telemetry buffer to feed into the ML model.
    Converts raw KeyEvents and MouseEvents into a single feature vector (1D array represented as a single-row DataFrame).
    """
    keys = buffer.snapshot_keys()
    mice = buffer.snapshot_mouse()

    features = {}

    # Keyboard Features
    if not keys:
        # Defaults if no keyboard activity
        features.update({
            'kb_dwell_mean': 0.0, 'kb_dwell_std': 0.0, 'kb_dwell_max': 0.0,
            'kb_flight_mean': 0.0, 'kb_flight_std': 0.0, 'kb_flight_min': 0.0
        })
    else:
        dwells = np.array([k.dwell_ms for k in keys])
        flights = np.array([k.flight_ms for k in keys])
        
        features.update({
            'kb_dwell_mean': np.mean(dwells),
            'kb_dwell_std': np.std(dwells) if len(dwells) > 1 else 0.0,
            'kb_dwell_max': np.max(dwells),
            'kb_flight_mean': np.mean(flights),
            'kb_flight_std': np.std(flights) if len(flights) > 1 else 0.0,
            'kb_flight_min': np.min(flights)
        })

    # Mouse Features
    if not mice:
        features.update({
            'mouse_speed_mean': 0.0, 'mouse_speed_std': 0.0, 'mouse_speed_max': 0.0,
            'mouse_accel_mean': 0.0, 'mouse_accel_std': 0.0,
            'mouse_click_mean': 0.0
        })
    else:
        speeds = np.array([m.speed_px_per_ms for m in mice if m.speed_px_per_ms > 0])
        accels = np.array([m.accel_px_per_ms2 for m in mice])
        clicks = np.array([m.click_duration_ms for m in mice if m.click_duration_ms > 0])

        features.update({
            'mouse_speed_mean': np.mean(speeds) if len(speeds) > 0 else 0.0,
            'mouse_speed_std': np.std(speeds) if len(speeds) > 1 else 0.0,
            'mouse_speed_max': np.max(speeds) if len(speeds) > 0 else 0.0,
            
            'mouse_accel_mean': np.mean(accels) if len(accels) > 0 else 0.0,
            'mouse_accel_std': np.std(accels) if len(accels) > 1 else 0.0,
            
            'mouse_click_mean': np.mean(clicks) if len(clicks) > 0 else 0.0
        })

    # Return as a 1-row DataFrame (required for sklearn predict consistency)
    return pd.DataFrame([features])
