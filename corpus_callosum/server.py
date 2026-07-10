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
    return {"status": "online", "model": "llama-3.3-70b-versatile", "backend": "Groq"}

@app.post("/chat")
async def chat(request: ChatRequest):
    async def generate():
        try:
            from brain.callosum import corpus_callosum

            # ── Repo ingestion ──────────────────────────────────────────
            repo_code = ""
            if request.repo_url:
                yield f'data: {{"node": "system", "status": "cloning", "message": "Cloning {request.repo_url}..."}}\n\n'
                try:
                    with tempfile.TemporaryDirectory() as tmpdir:
                        result = subprocess.run(
                            ["git", "clone", "--depth", "1", request.repo_url, tmpdir],
                            capture_output=True, timeout=60
                        )
                        if result.returncode != 0:
                            raise RuntimeError(result.stderr.decode()[:300])

                        for ext in [".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".java", ".rs"]:
                            for p in Path(tmpdir).rglob(f"*{ext}"):
                                if any(skip in str(p) for skip in ["node_modules", "dist", "build", ".git", "__pycache__"]):
                                    continue
                                try:
                                    repo_code += f"--- {p.relative_to(tmpdir)} ---\n{p.read_text(errors='ignore')}\n\n"
                                except Exception:
                                    pass

                        # Cap at 25k chars to stay within model context
                        repo_code = repo_code[:25000]
                        yield f'data: {{"node": "system", "status": "ingested", "message": "Ingested {len(repo_code)} chars of source code."}}\n\n'
                except Exception as e:
                    repo_code = f"Failed to clone repo: {e}"
                    yield f'data: {{"node": "system", "status": "error", "message": "{str(e)[:200]}"}}\n\n'

            # ── LangGraph run ───────────────────────────────────────────
            initial_state = {
                "user_input":         request.message or "Perform a full code review.",
                "emotion_state":      request.emotion_state or "neutral",
                "editor_code":        request.editor_code or "",
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
                # Each event is {node_name: node_output_dict}
                for node_name, node_updates in event.items():
                    if not isinstance(node_updates, dict):
                        continue

                    if node_name == "amygdala":
                        brief = node_updates.get("amygdala_brief", {})
                        yield f'data: {json.dumps({"node": "amygdala", "status": "done", "data": brief})}\n\n'

                    elif node_name == "hippocampus":
                        report = node_updates.get("hippocampus_report", {})
                        yield f'data: {json.dumps({"node": "hippocampus", "status": "done", "data": report})}\n\n'

                    elif node_name == "syntax":
                        yield f'data: {{"node": "syntax", "status": "done"}}\n\n'

                    elif node_name == "logic":
                        yield f'data: {{"node": "logic", "status": "done"}}\n\n'

                    elif node_name == "security":
                        yield f'data: {{"node": "security", "status": "done"}}\n\n'

                    elif node_name == "frontal_lobe":
                        resp = node_updates.get("frontal_lobe_response", "")
                        final_response = resp
                        yield f'data: {{"node": "frontal_lobe", "status": "done"}}\n\n'
                        yield f'data: {{"node": "end", "response": {json.dumps(resp)}}}\n\n'
                        return  # done — stop streaming

            # Fallback if frontal_lobe never fired
            if not final_response:
                yield f'data: {{"node": "end", "response": "The neural network completed processing but produced no output. This may be a graph routing issue."}}\n\n'

        except Exception as exc:
            traceback.print_exc()
            yield f'data: {{"node": "error", "error": {json.dumps(str(exc))}}}\n\n'

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
