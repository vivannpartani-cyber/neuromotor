# Neuromotor 🧠⚡️

Neuromotor is an anatomical, multi-agent AI framework mapped directly to the structure of the human brain. Instead of a single monolithic model processing your requests in a black box, Neuromotor routes your inputs through 8 specialized "lobes," each powered by optimized LLMs (Llama 3.3, Qwen 3, etc.) running concurrently. 

Watch the actual cognitive process happen in real-time on a 3D WebGL neural simulation. 

## How it Works

When you submit a request (or a GitHub repo), Neuromotor routes the data through an anatomical pipeline via a `langgraph` state stream:

1. **Amygdala (Threat Detection):** Evaluates the prompt for urgency, emotional tone, and security risks.
2. **Hippocampus (Memory Recall):** Checks for past context, cached code patterns, and previous interactions.
3. **Wernicke's Area (Comprehension):** Parses the raw input and structures the problem statement.
4. **Parietal Lobe (Logic Tracing):** Maps out the logical dependencies and architectural requirements.
5. **Temporal Lobe (Pattern Recognition):** Identifies relevant algorithms, design patterns, and potential pitfalls.
6. **Prefrontal Cortex (Planning):** Synthesizes the findings into a concrete execution plan.
7. **Broca's Area (Code Generation):** Generates the final output or code implementation.
8. **Cerebellum (Refinement):** Handles final synchronization and animation updates.

### Long Context Compression
Neuromotor is integrated with **[SuperCompress](https://supercompress.dev/)**. If you feed the brain a massive codebase (via the Security mode repository ingestion), SuperCompress intercepts the data and shrinks it down to its most critical logic *before* it hits the LLMs—saving hundreds of thousands of tokens without losing the plot.

## The Interface
The frontend is a React + Three.js (React Three Fiber) application. The 3D brain model is composed of a volumetric glass core surrounded by 1,500 glowing neural fiber pathways mapped mathematically to the folds (gyri and sulci) of actual brain anatomy.
- **Idle State:** The brain spins smoothly with deep neon blue fibers shimmering subtly, processed entirely on the GPU via custom shaders for zero UI lag.
- **Active State:** As the backend `server.py` streams Server-Sent Events (SSE) representing each lobe's activation, the corresponding anatomical fibers ignite with intense, fast-moving energy pulses in their respective colors (e.g., green for Temporal, pink for Broca's), accompanied by floating labels.

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- API Keys for Groq (and optionally OpenAI/SuperCompress)

### Backend Setup
```bash
cd corpus_callosum
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Add your API keys to .env
python3 -m uvicorn server:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` to interact with the brain.

## Why?
Monolithic models hide their reasoning. Neuromotor exposes it. By splitting the cognitive load across multiple specialized agents, we can use faster, smaller models (like Llama 3 8B) for simple tasks like comprehension and threat detection, while saving massive models (like Qwen 32B) for complex logic tracing. Plus, it looks incredibly cool.
