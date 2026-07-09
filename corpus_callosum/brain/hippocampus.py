import chromadb
from brain.state import AgentState

# Phase 1: Setup Local ChromaDB
chroma_client = chromadb.PersistentClient(path="./hippocampus_memory")
collection = chroma_client.get_or_create_collection(name="episodic_memory")

def add_memory(doc_id: str, text: str):
    """Helper function to add documents to long-term memory."""
    collection.add(documents=[text], ids=[doc_id])

# Phase 2: Hippocampus Node
def hippocampus_node(state: AgentState) -> dict:
    """Queries ChromaDB using the user_input and appends to context."""
    user_input = state.get("user_input", "")
    
    # Query the memory
    results = collection.query(query_texts=[user_input], n_results=3)
    
    retrieved_context = []
    if results["documents"] and len(results["documents"]) > 0:
        retrieved_context = results["documents"][0]
        
    return {"context": retrieved_context}
