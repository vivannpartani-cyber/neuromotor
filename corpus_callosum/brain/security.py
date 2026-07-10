"""
Security Node (Insular Lobe)
Focuses exclusively on potential vulnerabilities, SQLi, XSS, and exploit paths.
"""
import os
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from brain.state import AgentState

def security_node(state: AgentState) -> dict:
    llm = ChatOpenAI(model="llama-3.3-70b-versatile", temperature=0, base_url="https://api.groq.com/openai/v1", api_key=os.getenv("GROQ_API_KEY"))
    
    sys_prompt = f"""You are the Security Node. Focus ONLY on identifying exploits, input validation failures, injection risks, and vulnerabilities. Ignore general logic and syntax. Provide your security recommendations concisely.

[CURRENT REPOSITORY CODE]:
{state.get("repo_code", "None")}

Analyze the user's prompt and the provided repository code (if any) purely for SECURITY vulnerabilities.
Hunt for injection flaws, unescaped inputs, exposed secrets, or logic bugs that could be exploited.
"""
    
    response = llm.invoke([
        SystemMessage(content=sys_prompt),
        HumanMessage(content=f"Task: {state.get('user_input')}\nMemory: {state.get('hippocampus_report')}")
    ])
    return {"security_out": response.content}
