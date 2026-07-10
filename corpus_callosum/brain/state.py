"""
Shared state for the Neuromotor brain graph.
Maps to real anatomical brain regions.
"""
from typing import Annotated, List, Optional
from typing_extensions import TypedDict
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage


class AgentState(TypedDict):
    # Input
    user_input:         str
    emotion_state:      str
    editor_code:        str
    repo_code:          str
    mode:               str   # "chat" | "debug" | "architect" | "security"
    overdrive:          bool  # Hyper-Focus flag

    # Memory
    messages:           Annotated[list[BaseMessage], add_messages]
    context:            List[str]
    hippocampus_report: dict

    # Biometric
    amygdala_brief:     dict

    # Anatomical node outputs (in firing order)
    wernicke_out:       str   # comprehension
    parietal_out:       str   # logic tracing
    temporal_out:       str   # pattern recognition
    prefrontal_out:     str   # planning
    broca_out:          str   # generation

    # Final
    final_response:     str
    is_urgent:          bool
