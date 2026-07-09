import os
import joblib
import logging
from typing import Optional
import pandas as pd
from sklearn.ensemble import IsolationForest

logger = logging.getLogger(__name__)

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model.pkl')

class NeuromotorModel:
    def __init__(self, contamination: float = 0.15):
        """
        contamination: The proportion of outliers in the data set. 
        Higher values make the model more aggressive at locking.
        """
        self.model = IsolationForest(
            n_estimators=100, 
            contamination=contamination, 
            random_state=42
        )
        self.is_trained = False
        self._training_data: pd.DataFrame = pd.DataFrame()

    def accumulate_training_data(self, features: pd.DataFrame):
        """Accumulates feature vectors over time to build a robust baseline."""
        self._training_data = pd.concat([self._training_data, features], ignore_index=True)

    def train(self) -> bool:
        """Trains the IsolationForest on accumulated data."""
        if len(self._training_data) < 10:
            logger.warning("Not enough training data to build a reliable model.")
            return False

        logger.info(f"Training model on {len(self._training_data)} samples...")
        self.model.fit(self._training_data)
        self.is_trained = True
        self.save()
        return True

    def predict(self, features: pd.DataFrame) -> bool:
        """
        Predicts if the current features represent an anomaly.
        Returns True if ANOMALY (imposter), False if NORMAL (owner).
        """
        if not self.is_trained:
            logger.warning("Model not trained, cannot predict.")
            return False

        # Returns 1 for inliers, -1 for outliers
        prediction = self.model.predict(features)
        
        # We consider it an anomaly if the prediction is -1
        return bool(prediction[0] == -1)

    def save(self, filepath: str = MODEL_PATH):
        if self.is_trained:
            joblib.dump(self.model, filepath)
            logger.info(f"Model saved to {filepath}")

    def load(self, filepath: str = MODEL_PATH) -> bool:
        if os.path.exists(filepath):
            self.model = joblib.load(filepath)
            self.is_trained = True
            logger.info(f"Model loaded from {filepath}")
            return True
        return False
