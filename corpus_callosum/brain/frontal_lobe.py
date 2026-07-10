"""
Frontal Lobe Node (Activation Function)
Aggregates the parallel responses from Syntax, Logic, and Security.
"""
import os
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from brain.state import AgentState

def frontal_lobe_node(state: AgentState) -> dict:
    llm = ChatOpenAI(model="llama-3.3-70b-versatile", temperature=0, base_url="https://api.groq.com/openai/v1", api_key=os.getenv("GROQ_API_KEY"))
    
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

[CURRENT REPOSITORY CODE]:
{state.get("repo_code", "None")}

Synthesize the above into the final output. If the user provided a GitHub repository URL, you MUST output a comprehensive Markdown CODE REVIEW REPORT.
The Code Review Report should include 3 sections based on your Hidden Layers:
1. Syntax & Style Audit
2. Logic & Performance Audit
3. Security Audit
Use GitHub Flavored Markdown.
"""
    
    response = llm.invoke([
        SystemMessage(content=sys_prompt),
        HumanMessage(content=f"User Task: {state.get('user_input')}")
    ])
    
    return {"frontal_lobe_response": response.content}
