import os
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_tavily import TavilySearch
from brain.state import AgentState
from brain.llm import get_llm

def _make_tools():
    """Only instantiate Tavily when the API key is present."""
    if os.getenv("TAVILY_API_KEY"):
        return [TavilySearch(max_results=2)]
    return []

def frontal_lobe_node(state: AgentState) -> dict:
    """Executive reasoning center — uses tools and context to produce the final response."""
    active_tools = _make_tools()
    llm = get_llm(temperature=0.2)
    llm_with_tools = llm.bind_tools(active_tools) if active_tools else llm

    context_str = "\n".join(state.get("context", []))

    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            "You are the Frontal Lobe, the executive reasoning center of a multi-agent AI brain. "
            "Use the Hippocampus context below to ground your response, and use your tools to "
            "gather any additional real-world information you need.\n\n"
            f"Hippocampus Context:\n{context_str or '(none retrieved)'}",
        ),
        MessagesPlaceholder(variable_name="messages"),
        ("user", "{user_input}"),
    ])

    chain = prompt | llm_with_tools
    response = chain.invoke({
        "messages": state.get("messages", []),
        "user_input": state.get("user_input", ""),
    })

    return {"messages": [response], "final_response": response.content}
