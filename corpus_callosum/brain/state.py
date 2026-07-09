import operator
from typing import TypedDict, List, Annotated, Optional
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    user_input:         str
    emotion_state:      str
    editor_code:        str
    repo_code:          str
    messages:           Annotated[list[BaseMessage], add_messages]
    context:            List[str]
    is_urgent:          bool
    final_response:     str
    amygdala_brief:     dict
    hippocampus_report: dict
    syntax_out:         str
    logic_out:          str
    security_out:       str

