"""
Logic Node (Temporal Lobe)
Focuses exclusively on algorithmic efficiency, Big-O complexity, and edge cases.
"""
import os
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from brain.state import AgentState

def logic_node(state: AgentState) -> dict:
    llm = ChatOpenAI(model="openai/gpt-oss-120b", temperature=0, base_url="https://api.groq.com/openai/v1", api_key=os.getenv("GROQ_API_KEY"))
    
    sys_prompt = "You are the Logic Node. Focus ONLY on algorithmic efficiency (Time/Space complexity) and edge cases. Ignore formatting and security. Provide your performance and logic recommendations concisely."
    
    response = llm.invoke([
        SystemMessage(content=sys_prompt),
        HumanMessage(content=f"Task: {state.get('user_input')}\nMemory: {state.get('hippocampus_report')}")
    ])
    return {"logic_out": response.content}
