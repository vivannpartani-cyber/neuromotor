import asyncio
import logging
from enum import Enum

from neuromotor_auth.ml.pipeline import extract_features
from neuromotor_auth.ml.model import NeuromotorModel
from neuromotor_auth.defense.os_lock import lock_screen
from neuromotor_auth.telemetry.daemon_manager import TelemetryManager

logger = logging.getLogger(__name__)

telemetry_manager = TelemetryManager(buffer_maxlen=1000, diagnostic_interval_s=0)

class EngineState(Enum):
    IDLE = "idle"
    TRAINING = "training"
    INFERENCE = "inference"

class AuthenticationEngine:
    def __init__(self):
        self.state = EngineState.IDLE
        self.model = NeuromotorModel()
        # Try to load existing model
        self.model.load()
        self._task = None

    async def _loop(self):
        """The main execution loop for training or inference."""
        while self.state != EngineState.IDLE:
            await asyncio.sleep(2.0) # Process window every 2 seconds

            # 1. Extract features from the current telemetry window
            features = extract_features(telemetry_manager.buffer)
            
            # Clear the buffer to prepare for the next window
            telemetry_manager.buffer.clear()

            if self.state == EngineState.TRAINING:
                logger.info("Accumulating training data...")
                self.model.accumulate_training_data(features)
            
            elif self.state == EngineState.INFERENCE:
                # 2. Predict anomaly
                is_anomaly = self.model.predict(features)
                if is_anomaly:
                    logger.warning("Anomaly score crossed threshold!")
                    # 3. Defend
                    lock_screen()
                    # Reset state after lock to prevent loop
                    self.stop()
                    break

    def start_training(self):
        if self.state == EngineState.TRAINING:
            return
        logger.info("Engine switching to TRAINING mode.")
        self.state = EngineState.TRAINING
        telemetry_manager.buffer.clear()
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._loop())

    def stop_training(self):
        if self.state == EngineState.TRAINING:
            logger.info("Stopping training and building model...")
            self.stop()
            success = self.model.train()
            return success
        return False

    def start_inference(self):
        if not self.model.is_trained:
            logger.error("Cannot start inference without a trained model.")
            return False
            
        if self.state == EngineState.INFERENCE:
            return True
            
        logger.info("Engine switching to INFERENCE (Defense) mode.")
        self.state = EngineState.INFERENCE
        telemetry_manager.buffer.clear()
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._loop())
        return True

    def stop(self):
        logger.info("Engine switching to IDLE mode.")
        self.state = EngineState.IDLE
        
# Global engine instance
auth_engine = AuthenticationEngine()
