"""
Hippocampus Node — The Memory Palace

Two capabilities ChatGPT cannot match:
1. It RETRIEVES relevant episodic memories from local ChromaDB for every query.
2. It WRITES the current exchange to memory so the brain gets smarter over time.

It also detects if a topic has come up before and flags it as context.
"""
import uuid
import chromadb
from brain.state import AgentState

# Persistent local vector database — survives across restarts
chroma_client = chromadb.PersistentClient(path="./hippocampus_memory")
collection = chroma_client.get_or_create_collection(
    name="episodic_memory",
    metadata={"hnsw:space": "cosine"},
)


def add_memory(text: str, metadata: dict | None = None) -> str:
    """Write a document to long-term memory. Returns the doc ID."""
    doc_id = str(uuid.uuid4())
    collection.add(
        documents=[text],
        ids=[doc_id],
        metadatas=[metadata or {}],
    )
    return doc_id


def hippocampus_node(state: AgentState) -> dict:
    """
    Memory retrieval + write.
    - Retrieves the top-3 semantically similar memories for the current query.
    - After retrieval, records the current query so future interactions are richer.
    """
    user_input = state.get("user_input", "")
    retrieved_context: list[str] = []
    memory_summary: str = "(No relevant memories found)"
    repeat_topic: bool = False

    # ── Retrieve ──────────────────────────────────────────────
    total = collection.count()
    if total > 0:
        n = min(3, total)
        results = collection.query(query_texts=[user_input], n_results=n)

        docs      = results.get("documents", [[]])[0]
        distances = results.get("distances",  [[]])[0]

        # Cosine distance: 0 = identical, 2 = opposite
        # We surface memories with distance < 0.6 (reasonably relevant)
        relevant = [(d, dist) for d, dist in zip(docs, distances) if dist < 0.6]

        if relevant:
            retrieved_context = [d for d, _ in relevant]
            repeat_topic = any(dist < 0.25 for _, dist in relevant)
            snippets = "\n".join(
                f"[Memory {i+1}, relevance={1-dist:.0%}]: {doc[:200]}"
                for i, (doc, dist) in enumerate(relevant)
            )
            memory_summary = (
                f"Found {len(relevant)} relevant memory/memories"
                + (" — this topic has come up before." if repeat_topic else ".")
                + f"\n{snippets}"
            )

    # ── Write current query to memory ─────────────────────────
    # Store the raw query so future sessions can recall it
    add_memory(
        text=user_input,
        metadata={"type": "user_query", "domain": state.get("amygdala_brief", {}).get("topic_domain", "unknown")},
    )

    return {
        "context": retrieved_context,
        "hippocampus_report": {
            "memory_summary": memory_summary,
            "repeat_topic":   repeat_topic,
            "memories_found": len(retrieved_context),
        },
    }
