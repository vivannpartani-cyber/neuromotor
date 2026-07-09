import argparse
import asyncio
import logging
import sys
from neuromotor_auth.core.engine import auth_engine, telemetry_manager, EngineState

# Configure basic logging for CLI
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')
logger = logging.getLogger("neuromotor_cli")

async def run_training(duration_seconds: int):
    logger.info("Starting Neuromotor Baseline Training...")
    telemetry_manager.start()
    auth_engine.start_training()
    
    logger.info(f"Please type naturally for the next {duration_seconds} seconds...")
    try:
        await asyncio.sleep(duration_seconds)
    except KeyboardInterrupt:
        logger.info("Training interrupted by user.")
    
    auth_engine.stop_training()
    telemetry_manager.stop()
    logger.info("Training complete. Baseline model compiled successfully!")

async def run_defense():
    if not auth_engine.model.is_trained:
        logger.error("No trained baseline model found. Please run 'neuromotor train' first.")
        sys.exit(1)
        
    logger.info("Arming Neuromotor Defense System...")
    logger.info("Monitoring in background. Press Ctrl+C to disarm.")
    telemetry_manager.start()
    auth_engine.start_inference()
    
    try:
        # Keep the daemon running indefinitely until an anomaly triggers a lock
        # which will call auth_engine.stop() and exit the loop, or user interrupts.
        while auth_engine.state == EngineState.INFERENCE:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        logger.info("Defense disarmed by user.")
        
    auth_engine.stop()
    telemetry_manager.stop()
    logger.info("Defense system offline.")

def main():
    parser = argparse.ArgumentParser(description="Neuromotor Continuous Authentication CLI")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    train_parser = subparsers.add_parser("train", help="Train the baseline biometric model")
    train_parser.add_argument("--duration", type=int, default=60, help="Duration to record training data in seconds (default: 60)")

    defend_parser = subparsers.add_parser("defend", help="Arm the defense system (runs headlessly)")

    args = parser.parse_args()

    if args.command == "train":
        asyncio.run(run_training(args.duration))
    elif args.command == "defend":
        asyncio.run(run_defense())
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
