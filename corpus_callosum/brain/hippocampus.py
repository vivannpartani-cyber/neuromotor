"""
Hippocampus Node — The Memory Palace (Powered by Supermemory.ai)

Connects to the cloud-scale Supermemory API to read and write episodic
memory, allowing the system to scale its knowledge graph infinitely
across sessions and platforms.
"""
import os
import httpx
from brain.state import AgentState


def add_memory(text: str, metadata: dict | None = None) -> bool:
    """Write a document to Supermemory.ai."""
    api_key = os.getenv("SUPERMEMORY_API_KEY")
    if not api_key:
        print("[Hippocampus] No SUPERMEMORY_API_KEY set.")
        return False

    try:
        response = httpx.post(
            "https://api.supermemory.ai/add",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "memory": text,
                "metadata": metadata or {}
            },
            timeout=10.0
        )
        return response.status_code == 200
    except Exception as e:
        print(f"[Hippocampus] Supermemory write failed: {e}")
        return False


def hippocampus_node(state: AgentState) -> dict:
    """
    Memory retrieval + write using Supermemory.ai.
    """
    user_input = state.get("user_input", "")
    api_key = os.getenv("SUPERMEMORY_API_KEY")
    
    retrieved_context: list[str] = []
    memory_summary: str = "(No relevant memories found)"
    repeat_topic: bool = False
    
    if api_key:
        try:
            # Search Supermemory for similar past contexts
            response = httpx.post(
                "https://api.supermemory.ai/query",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={"query": user_input, "top_k": 3},
                timeout=10.0
            )
            
            if response.status_code == 200:
                results = response.json().get("results", [])
                
                # Format retrieved memories
                if results:
                    retrieved_context = [r.get("memory", "") for r in results]
                    # Simulate relevance threshold/repeat topic logic
                    repeat_topic = len(results) > 0 and results[0].get("score", 0) > 0.8
                    snippets = "\n".join(
                        f"[Memory {i+1}]: {r.get('memory', '')[:200]}"
                        for i, r in enumerate(results)
                    )
                    memory_summary = (
                        f"Found {len(results)} relevant memory/memories"
                        + (" — this topic has come up before." if repeat_topic else ".")
                        + f"\n{snippets}"
                    )
        except Exception as e:
            print(f"[Hippocampus] Supermemory query failed: {e}")
            memory_summary = f"(Supermemory query failed: {e})"

    # Write current query to Supermemory
    add_memory(
        text=user_input,
        metadata={"type": "user_query", "domain": state.get("amygdala_brief", {}).get("topic_domain", "unknown")}
    )

    return {
        "context": retrieved_context,
        "hippocampus_report": {
            "memory_summary": memory_summary,
            "repeat_topic":   repeat_topic,
            "memories_found": len(retrieved_context),
        },
    }
