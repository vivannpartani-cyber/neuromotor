"""
Corpus Callosum — FastAPI SSE Server

Run with:
    cd corpus_callosum
    uvicorn server:app --reload --port 8000
"""
import os
import sys
import json
import traceback
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

# Load env before importing brain modules so API keys are available
load_dotenv()

app = FastAPI(title="Corpus Callosum API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str


@app.get("/health")
async def health():
    return {
        "status": "online",
        "model": "openai/gpt-oss-120b",
        "backend": "Groq",
    }


@app.post("/chat")
async def chat(request: ChatRequest):
    async def generate():
        try:
            from brain.callosum import corpus_callosum

            initial_state = {
                "user_input": request.message,
                "messages": [],
                "context": [],
                "is_urgent": False,
                "final_response": "",
            }

            final_response = ""

            for event in corpus_callosum.stream(initial_state):
                for node_name, node_updates in event.items():
                    # Emit which node just fired
                    payload = json.dumps({"node": node_name, "status": "done"})
                    yield f"data: {payload}\n\n"

                    # Capture the final response wherever it appears
                    if (
                        isinstance(node_updates, dict)
                        and node_updates.get("final_response")
                    ):
                        final_response = node_updates["final_response"]

            # Send the final "end" event with the assembled response
            end_payload = json.dumps({
                "node": "end",
                "response": final_response or "Processing complete.",
            })
            yield f"data: {end_payload}\n\n"

        except Exception as exc:
            error_detail = f"{type(exc).__name__}: {exc}"
            print(f"[Corpus Callosum] Error in /chat: {error_detail}")
            traceback.print_exc()
            err_payload = json.dumps({"node": "error", "error": error_detail})
            yield f"data: {err_payload}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
