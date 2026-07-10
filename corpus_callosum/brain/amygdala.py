"""
Amygdala Node — The Sentinel and Biometric Evaluator

Evaluates threats, sets the emotional tone based on raw biometric data
from the webcam, and dictates routing rules for the Frontal Lobe.
"""
import os
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
import json
from brain.state import AgentState

def amygdala_node(state: AgentState) -> dict:
    llm = ChatOpenAI(model="llama-3.1-8b-instant", temperature=0, base_url="https://api.groq.com/openai/v1", api_key=os.getenv("GROQ_API_KEY"))
    
    physical_emotion = state.get("emotion_state") or "neutral"
    
    sys_prompt = f"""You are the Amygdala, the primitive survival center of the brain.
You receive raw inputs from the external world and biometric sensors.
Your job is to produce a strict JSON brief.

CURRENT BIOMETRIC SENSOR DATA:
User Facial Emotion: {physical_emotion.upper()}

CURRENT EDITOR CODE:
{state.get("editor_code", "None")}

Based on the user's message, their facial emotion, and the code they are working on, output JSON with:
- "threat_level": 0-10 (10 is immediate physical/system danger, anger increases threat)
- "emotional_tone": string (e.g., "hostile", "panicked", "calm", "curious")
- "topic_domain": string (e.g., "coding", "general", "system_alert")
- "routing_note": string (A strict 1-sentence directive to the Frontal Lobe, e.g., "User is frustrated with this python code; step in and debug it." or "User is relaxed.")
"""
    
    user_input = state.get("user_input", "")
    
    response = llm.invoke([
        SystemMessage(content=sys_prompt),
        HumanMessage(content=f"Message: {user_input}")
    ])
    
    try:
        # Groq might wrap in markdown blocks, strip them if present
        content = response.content.strip()
        if content.startswith("```json"):
            content = content[7:-3]
        elif content.startswith("```"):
            content = content[3:-3]
            
        brief = json.loads(content.strip())
    except Exception as e:
        print(f"[Amygdala] Failed to parse JSON: {e} - Raw: {response.content}")
        brief = {
            "threat_level": 0,
            "emotional_tone": physical_emotion,
            "topic_domain": "unknown",
            "routing_note": "Proceed normally."
        }
        
    return {"amygdala_brief": brief}
