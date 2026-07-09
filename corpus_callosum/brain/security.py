"""
Security Node (Insular Lobe)
Focuses exclusively on potential vulnerabilities, SQLi, XSS, and exploit paths.
"""
import os
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from brain.state import AgentState

def security_node(state: AgentState) -> dict:
    llm = ChatOpenAI(model="openai/gpt-oss-120b", temperature=0, base_url="https://api.groq.com/openai/v1", api_key=os.getenv("GROQ_API_KEY"))
    
    sys_prompt = "You are the Security Node. Focus ONLY on identifying exploits, input validation failures, injection risks, and vulnerabilities. Ignore general logic and syntax. Provide your security recommendations concisely."
    
    response = llm.invoke([
        SystemMessage(content=sys_prompt),
        HumanMessage(content=f"Task: {state.get('user_input')}\nMemory: {state.get('hippocampus_report')}")
    ])
    return {"security_out": response.content}
