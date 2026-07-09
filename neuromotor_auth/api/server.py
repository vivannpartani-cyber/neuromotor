import asyncio
import json
import logging
from typing import AsyncGenerator

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

from neuromotor_auth.core.engine import auth_engine, EngineState, telemetry_manager

logger = logging.getLogger(__name__)

app = FastAPI(title="Neuromotor-Auth API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    telemetry_manager.start()
    logger.info("API Server started, telemetry daemons running.")

@app.on_event("shutdown")
async def shutdown_event():
    telemetry_manager.stop()
    auth_engine.stop()
    logger.info("API Server shutdown, telemetry daemons stopped.")

@app.get("/api/status")
async def get_status():
    keys = telemetry_manager.buffer.snapshot_keys()
    mice = telemetry_manager.buffer.snapshot_mouse()
    return {
        "engine_state": auth_engine.state.value,
        "is_model_trained": auth_engine.model.is_trained,
        "key_buffer_size": len(keys),
        "mouse_buffer_size": len(mice)
    }

@app.post("/api/engine/train/start")
async def start_training():
    auth_engine.start_training()
    return {"status": "training_started"}

@app.post("/api/engine/train/stop")
async def stop_training():
    success = auth_engine.stop_training()
    if not success:
        raise HTTPException(status_code=400, detail="Failed to train model. Not enough data.")
    return {"status": "model_trained_successfully"}

@app.post("/api/engine/inference/start")
async def start_inference():
    success = auth_engine.start_inference()
    if not success:
        raise HTTPException(status_code=400, detail="Model is not trained yet.")
    return {"status": "inference_started"}

@app.post("/api/engine/stop")
async def stop_engine():
    auth_engine.stop()
    return {"status": "engine_stopped"}

async def event_generator(request: Request) -> AsyncGenerator:
    """Streams telemetry data to the frontend via Server-Sent Events."""
    while True:
        if await request.is_disconnected():
            break

        keys = telemetry_manager.buffer.snapshot_keys()
        mice = telemetry_manager.buffer.snapshot_mouse()

        payload = {
            "key_count": len(keys),
            "mouse_count": len(mice),
            "engine_state": auth_engine.state.value,
            "latest_dwell": keys[-1].dwell_ms if keys else 0,
            "latest_flight": keys[-1].flight_ms if keys else 0,
            "latest_speed": mice[-1].speed_px_per_ms if mice else 0
        }

        yield {
            "event": "telemetry",
            "data": json.dumps(payload)
        }
        await asyncio.sleep(0.5)

@app.get("/api/stream")
async def sse_endpoint(request: Request):
    return EventSourceResponse(event_generator(request))
