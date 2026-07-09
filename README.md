# Neuromotor

> **A multi-agent neuro-architecture system for intelligent, context-aware AI.**

This repository contains two components:

---

## 🧠 `corpus_callosum/` — The AI Brain
A graph-based multi-agent system modeled after human neuroanatomy.
Built with **LangGraph**, **ChromaDB**, **LangChain**, and **GPT-4o**.

**How to run:**
```bash
cd corpus_callosum
# Add your API keys to .env first
python3 main.py
```

**The Neuro-Architecture:**
- **Amygdala** — Threat & urgency router (fight-or-flight reflex)
- **Hippocampus** — Long-term memory via local ChromaDB (RAG)
- **Frontal Lobe** — Executive reasoning with web search tool use
- **Corpus Callosum** — The LangGraph StateGraph wiring it all together

---

## 🌐 `frontend/` — The Marketing Landing Page
A React/Vite SaaS landing page showcasing the project.
Deployable to Vercel (set Root Directory to `frontend`).

```bash
cd frontend
npm install
npm run dev
```

---

## 📦 `archive/` — Legacy CLI Daemon
The original `neuromotor` Python daemon for biometric keystroke authentication.
Archived for reference.

---

## Requirements
- Python 3.11+
- `OPENAI_API_KEY` in `corpus_callosum/.env`
- `TAVILY_API_KEY` in `corpus_callosum/.env`
