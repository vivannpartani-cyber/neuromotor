"""
Corpus Callosum — FastAPI SSE Server (V9)
Streams each anatomical brain region's activation to the frontend in real time.
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

app = FastAPI(title="Neuromotor API", version="9.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class ChatRequest(BaseModel):
    message:      str | None = None
    emotion_state: str | None = None
    editor_code:  str | None = None
    repo_url:     str | None = None
    mode:         str | None = "chat"   # chat | debug | architect | security
    overdrive:    bool | None = False


@app.get("/health")
async def health():
    return {"status": "online", "version": "9.0", "model": "llama-3.3-70b-versatile"}


@app.post("/chat")
async def chat(request: ChatRequest):
    async def generate():
        try:
            from brain.callosum import corpus_callosum

            # ── Repo ingestion (security/review mode) ──────────────────
            repo_code = ""
            if request.repo_url:
                yield f'data: {{"node": "system", "status": "cloning", "message": "Cloning repository..."}}\n\n'
                try:
                    with tempfile.TemporaryDirectory() as tmpdir:
                        result = subprocess.run(
                            ["git", "clone", "--depth", "1", request.repo_url, tmpdir],
                            capture_output=True, timeout=60
                        )
                        if result.returncode != 0:
                            raise RuntimeError(result.stderr.decode()[:300])

                        for ext in [".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".java", ".rs", ".cpp", ".c"]:
                            for p in Path(tmpdir).rglob(f"*{ext}"):
                                if any(s in str(p) for s in ["node_modules", "dist", "build", ".git", "__pycache__", "vendor"]):
                                    continue
                                try:
                                    repo_code += f"--- {p.relative_to(tmpdir)} ---\n{p.read_text(errors='ignore')}\n\n"
                                except Exception:
                                    pass
                        # ── SuperCompress API integration ──
                        if len(repo_code) > 1000:
                            yield f'data: {{"node": "system", "status": "compressing", "message": "Compressing context with SuperCompress..."}}\n\n'
                            try:
                                import httpx
                                sc_key = "sc_live_sck_bb40cecb5cc1ee55389f807e_PFDX6qVO4-dY73vrKs03QsLy7Q2h1-aE"
                                with httpx.Client() as client:
                                    resp = client.post(
                                        "https://supercompress.dev/compress",
                                        json={"context": repo_code, "query": request.message or "Analyze this code."},
                                        headers={"X-API-Key": sc_key},
                                        timeout=30.0
                                    )
                                    if resp.status_code == 200:
                                        data = resp.json()
                                        repo_code = data.get("compressed_text", repo_code)
                                        saved = data.get("tokens_saved", 0)
                                        yield f'data: {{"node": "system", "status": "compressed", "message": "SuperCompress saved {saved} tokens."}}\n\n'
                            except Exception as e:
                                yield f'data: {{"node": "system", "status": "warning", "message": "SuperCompress failed. Using raw context."}}\n\n'

                        repo_code = repo_code[:25000]
                        yield f'data: {{"node": "system", "status": "ingested", "message": "Repository ready — {len(repo_code)} chars of source code."}}\n\n'
                except Exception as e:
                    repo_code = f"Failed to clone repo: {e}"
                    yield f'data: {{"node": "system", "status": "error", "message": "{str(e)[:200]}"}}\n\n'

            # ── Build initial state ─────────────────────────────────────
            initial_state = {
                "user_input":         request.message or "Analyze this code.",
                "emotion_state":      request.emotion_state or "neutral",
                "editor_code":        request.editor_code or "",
                "repo_code":          repo_code,
                "mode":               request.mode or "chat",
                "overdrive":          request.overdrive or False,
                "messages":           [],
                "context":            [],
                "is_urgent":          False,
                "final_response":     "",
                "amygdala_brief":     {},
                "hippocampus_report": {},
                "wernicke_out":       "",
                "parietal_out":       "",
                "temporal_out":       "",
                "prefrontal_out":     "",
                "broca_out":          "",
            }

            # ── Stream graph events ─────────────────────────────────────
            # Map node names to human-readable labels for the frontend
            NODE_LABELS = {
                "amygdala":    "Amygdala · Threat Detection",
                "hippocampus": "Hippocampus · Memory Recall",
                "wernicke":    "Wernicke's Area · Comprehension",
                "parietal":    "Parietal Lobe · Logic Tracing",
                "temporal":    "Temporal Lobe · Pattern Recognition",
                "prefrontal":  "Prefrontal Cortex · Planning",
                "broca":       "Broca's Area · Code Generation",
                "cerebellum":  "Cerebellum · Refinement",
            }

            for event in corpus_callosum.stream(initial_state):
                for node_name, node_updates in event.items():
                    if not isinstance(node_updates, dict):
                        continue

                    label = NODE_LABELS.get(node_name, node_name)

                    if node_name == "cerebellum":
                        final = node_updates.get("final_response", node_updates.get("broca_out", ""))
                        yield f'data: {{"node": "cerebellum", "label": "{label}", "status": "done"}}\n\n'
                        yield f'data: {{"node": "end", "response": {json.dumps(final)}}}\n\n'
                        return

                    elif node_name == "amygdala":
                        brief = node_updates.get("amygdala_brief", {})
                        yield f'data: {json.dumps({"node": node_name, "label": label, "status": "done", "threat": brief.get("threat_level", 0), "tone": brief.get("emotional_tone", "neutral")})}\n\n'

                    elif node_name == "hippocampus":
                        report = node_updates.get("hippocampus_report", {})
                        yield f'data: {json.dumps({"node": node_name, "label": label, "status": "done", "memories": report.get("memories_found", 0)})}\n\n'

                    else:
                        yield f'data: {{"node": "{node_name}", "label": {json.dumps(label)}, "status": "done"}}\n\n'

            yield f'data: {{"node": "end", "response": "The neural network completed but produced no output."}}\n\n'

        except Exception as exc:
            traceback.print_exc()
            err_str = str(exc)
            # Detect Groq rate limit errors and give a friendly message
            if "rate_limit_exceeded" in err_str or "Rate limit" in err_str or "tokens per day" in err_str:
                friendly = "⚡ Groq free-tier daily token limit reached. The brain needs to rest! Try again in a few minutes, or upgrade your Groq plan at console.groq.com/settings/billing."
            elif "model_decommissioned" in err_str:
                friendly = "🔧 A model was retired by Groq mid-session. Restart the backend and try again."
            else:
                friendly = err_str
            yield f'data: {{"node": "error", "error": {json.dumps(friendly)}}}\n\n'

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
