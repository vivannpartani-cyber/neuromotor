"""
Frontal Lobe Node (Activation Function)
Aggregates the parallel responses from Syntax, Logic, and Security.
"""
import os
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from brain.state import AgentState

def frontal_lobe_node(state: AgentState) -> dict:
    llm = ChatOpenAI(model="openai/gpt-oss-120b", temperature=0, base_url="https://api.groq.com/openai/v1", api_key=os.getenv("GROQ_API_KEY"))
    
    sys_prompt = f"""You are the Frontal Lobe, the final Activation Function of this Neural Network Coding Agent.
You receive parallel processed inputs from your Hidden Layers. Your job is to synthesize them into a single, flawless, comprehensive response for the user.

[AMYGDALA BIOMETRIC BRIEF]:
{state.get("amygdala_brief")}

[HIPPOCAMPUS MEMORY]:
{state.get("hippocampus_report")}

[SYNTAX NODE (Parietal Lobe) OUTPUT]:
{state.get("syntax_out")}

[LOGIC NODE (Temporal Lobe) OUTPUT]:
{state.get("logic_out")}

[SECURITY NODE (Insular Lobe) OUTPUT]:
{state.get("security_out")}

[CURRENT EDITOR CODE]:
{state.get("editor_code", "None")}

Synthesize the above into the final output. If the user is frustrated, offer a helpful debug or fix.
IMPORTANT: Any code you write MUST be placed inside triple backticks (```python ... ```). 
The frontend parses these blocks directly into the user's Scratchpad.
"""
    
    response = llm.invoke([
        SystemMessage(content=sys_prompt),
        HumanMessage(content=f"User Task: {state.get('user_input')}")
    ])
    
    return {"frontal_lobe_response": response.content}
