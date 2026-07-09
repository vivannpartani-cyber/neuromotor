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
import subprocess
import tempfile
import shutil
from pathlib import Path

load_dotenv()

app = FastAPI(title="Corpus Callosum API", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class ChatRequest(BaseModel):
    message: str | None = None
    emotion_state: str | None = None
    editor_code: str | None = None
    repo_url: str | None = None



@app.get("/health")
async def health():
    return {"status": "online", "model": "openai/gpt-oss-120b", "backend": "Groq", "bci": "Brain2Qwerty v2"}

@app.post("/chat")

async def chat(request: ChatRequest):
    async def generate():
        try:
            from brain.callosum import corpus_callosum
            
            # If repo_url is provided, clone and ingest it
            repo_code = ""
            if request.repo_url:
                try:
                    with tempfile.TemporaryDirectory() as tmpdir:
                        subprocess.run(["git", "clone", "--depth", "1", request.repo_url, tmpdir], check=True, capture_output=True)
                        for ext in [".py", ".ts", ".tsx", ".js", ".jsx"]:
                            for p in Path(tmpdir).rglob(f"*{ext}"):
                                if "node_modules" in str(p) or "dist" in str(p) or "build" in str(p):
                                    continue
                                try:
                                    repo_code += f"--- {p.name} ---\n{p.read_text()}\n\n"
                                except:
                                    pass
                        # truncate to 30k chars so we don't blow context
                        repo_code = repo_code[:30000]
                except Exception as e:
                    repo_code = f"Error cloning repo: {e}"

            initial_state = {
                "user_input":         request.message or "",
                "emotion_state":      request.emotion_state,
                "editor_code":        request.editor_code,
                "repo_code":          repo_code,
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
                        frontal_resp = node_data.get("frontal_lobe_response", "")
                        final_response = frontal_resp
                        yield f'data: {{"node": "frontal_lobe", "data": {{}}}}\n\n'
                        yield f'data: {{"node": "end", "response": {json.dumps(frontal_resp)}}}\n\n'
                    else:
                        # Catch the parallel nodes
                        for node_name in ["syntax", "logic", "security"]:
                            if node_name in event:
                                yield f'data: {{"node": "{node_name}", "data": {{}}}}\n\n'

                    yield f"data: {json.dumps(meta)}\n\n"

            if not final_response:
                yield f"data: {json.dumps({'node': 'end', 'response': 'Processing complete.'})}\n\n"


        except Exception as exc:
            print(f"[Error] {exc}")
            traceback.print_exc()
            yield f"data: {json.dumps({'node': 'error', 'error': str(exc)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
