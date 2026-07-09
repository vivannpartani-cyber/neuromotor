"""
Syntax Node (Parietal Lobe)
Focuses exclusively on language idioms, clean architecture, and standard practices.
"""
import os
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from brain.state import AgentState

def syntax_node(state: AgentState) -> dict:
    llm = ChatOpenAI(model="openai/gpt-oss-120b", temperature=0, base_url="https://api.groq.com/openai/v1", api_key=os.getenv("GROQ_API_KEY"))
    
    sys_prompt = f"""You are the Syntax Node. Focus ONLY on clean code architecture, readability, and idiomatic language patterns. Ignore algorithmic complexity and security. Provide your specific syntax recommendations concisely.

[CURRENT REPOSITORY CODE]:
{state.get("repo_code", "None")}

Analyze the user's prompt and the provided repository code (if any) purely for SYNTAX, STYLE, and FORMATTING.
Provide strict, PEP-8 / standard-compliant code. Focus on readability.
"""
    
    response = llm.invoke([
        SystemMessage(content=sys_prompt),
        HumanMessage(content=f"Task: {state.get('user_input')}\nMemory: {state.get('hippocampus_report')}")
    ])
    return {"syntax_out": response.content}
