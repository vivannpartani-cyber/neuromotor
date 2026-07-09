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

Synthesize the above into the final output. If Amygdala threat is high, be concise. Present the final code clearly. Do not reveal the inner node outputs to the user directly unless it's useful to explain the synthesis.
"""
    
    response = llm.invoke([
        SystemMessage(content=sys_prompt),
        HumanMessage(content=f"User Task: {state.get('user_input')}")
    ])
    
    return {"frontal_lobe_response": response.content}
