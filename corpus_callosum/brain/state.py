import operator
from typing import TypedDict, List, Annotated
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

class AgentState(TypedDict):
    user_input: str
    messages: Annotated[list[BaseMessage], add_messages]
    context: List[str]
    is_urgent: bool
    final_response: str
