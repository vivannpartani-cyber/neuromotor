"""
Logic Node (Temporal Lobe)
Focuses exclusively on algorithmic efficiency, Big-O complexity, and edge cases.
"""
import os
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from brain.state import AgentState

def logic_node(state: AgentState) -> dict:
    llm = ChatOpenAI(model="llama-3.3-70b-versatile", temperature=0, base_url="https://api.groq.com/openai/v1", api_key=os.getenv("GROQ_API_KEY"))
    
    sys_prompt = f"""
    You are the Logic Node.
    
    [CURRENT REPOSITORY CODE]:
    {state.get("repo_code", "None")}

    Analyze the user's prompt and the provided repository code (if any) purely for LOGIC, ALGORITHMS, and EFFICIENCY.
    Focus on time/space complexity, edge cases, and robust architectures.
    Ignore formatting and security. Provide your performance and logic recommendations concisely.
    """
    
    response = llm.invoke([
        SystemMessage(content=sys_prompt),
        HumanMessage(content=f"Task: {state.get('user_input')}\nMemory: {state.get('hippocampus_report')}")
    ])
    return {"logic_out": response.content}
