"""
Corpus Callosum — FastAPI SSE Server

Run with:
    cd corpus_callosum
    python3 -m uvicorn server:app --reload --port 8000
"""
import os
import json
import traceback
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Corpus Callosum API", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class ChatRequest(BaseModel):
    message: str | None = None
    emotion_state: str | None = None
    editor_code: str | None = None



@app.get("/health")
async def health():
    return {"status": "online", "model": "openai/gpt-oss-120b", "backend": "Groq", "bci": "Brain2Qwerty v2"}

@app.post("/chat")

async def chat(request: ChatRequest):
    async def generate():
        try:
            from brain.callosum import corpus_callosum

            initial_state = {
                "user_input":         request.message or "",
                "emotion_state":      request.emotion_state,
                "editor_code":        request.editor_code,
                "messages":           [],

                "context":            [],
                "is_urgent":          False,
                "final_response":     "",
                "amygdala_brief":     {},
                "hippocampus_report": {},
            }

            final_response = ""

            for event in corpus_callosum.stream(initial_state):
                for node_name, node_updates in event.items():
                    if not isinstance(node_updates, dict):
                        continue

                    # Build rich metadata for the frontend to display
                    meta: dict = {"node": node_name, "status": "done"}

                    if node_name == "amygdala":
                        brief = node_updates.get("amygdala_brief", {})
                        meta["data"] = {
                            "threat_level":   brief.get("threat_level", 0),
                            "emotional_tone": brief.get("emotional_tone", "neutral"),
                            "topic_domain":   brief.get("topic_domain", "other"),
                            "routing_note":   brief.get("routing_note", ""),
                        }

                    elif node_name == "hippocampus":
                        report = node_updates.get("hippocampus_report", {})
                        meta["data"] = {
                            "memories_found": report.get("memories_found", 0),
                            "memory_summary": report.get("memory_summary", ""),
                            "repeat_topic":   report.get("repeat_topic", False),
                        }

                    elif "frontal_lobe" in event:
                        node_data = event["frontal_lobe"]
                        # We pass the final synthesized response to the frontend
                        yield f'data: {{"node": "frontal_lobe", "data": {{}}}}\n\n'
                        yield f'data: {{"node": "end", "response": {json.dumps(node_data.get("frontal_lobe_response", ""))}}}\n\n'
                    else:
                        # Catch the parallel nodes
                        for node_name in ["syntax", "logic", "security"]:
                            if node_name in event:
                                yield f'data: {{"node": "{node_name}", "data": {{}}}}\n\n'

                        # Capture final response
                        if node_updates.get("final_response"):
                            final_response = node_updates["final_response"]

                    yield f"data: {json.dumps(meta)}\n\n"

            yield f"data: {json.dumps({'node': 'end', 'response': final_response or 'Processing complete.'})}\n\n"

        except Exception as exc:
            print(f"[Error] {exc}")
            traceback.print_exc()
            yield f"data: {json.dumps({'node': 'error', 'error': str(exc)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
