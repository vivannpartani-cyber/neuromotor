from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_tavily import TavilySearch
from brain.state import AgentState
import os

def _make_tools():
    """Lazily instantiate tools only when TAVILY_API_KEY is present."""
    if os.getenv("TAVILY_API_KEY"):
        return [TavilySearch(max_results=2)]
    return []

def frontal_lobe_node(state: AgentState) -> dict:
    """The executive function that reasons through problems using tools and context."""
    active_tools = _make_tools()
    llm = ChatOpenAI(model="gpt-4o", temperature=0.2)
    llm_with_tools = llm.bind_tools(active_tools) if active_tools else llm
    
    context_str = "\n".join(state.get("context", []))
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are the Frontal Lobe, the executive reasoning center. "
                   "Use the provided Hippocampus context to inform your decisions, and use tools to gather external info.\n"
                   f"Hippocampus Context:\n{context_str}"),
        MessagesPlaceholder(variable_name="messages"),
        ("user", "{user_input}")
    ])
    
    chain = prompt | llm_with_tools
    
    response = chain.invoke({
        "messages": state.get("messages", []), 
        "user_input": state.get("user_input", "")
    })
    
    return {"messages": [response], "final_response": response.content}
