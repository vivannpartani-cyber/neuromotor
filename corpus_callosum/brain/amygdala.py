from pydantic import BaseModel, Field
from langchain_core.prompts import PromptTemplate
from brain.state import AgentState
from brain.llm import get_llm

class AmygdalaResponse(BaseModel):
    is_urgent: bool = Field(
        description="True if the input is a threat, urgent command, or requires an immediate reflex response."
    )
    immediate_action: str = Field(
        description="The immediate reflex response if urgent, otherwise an empty string."
    )

def amygdala_node(state: AgentState) -> dict:
    """Fight-or-flight classifier. Bypasses the rest of the brain for urgent inputs."""
    llm = get_llm(temperature=0)
    structured_llm = llm.with_structured_output(AmygdalaResponse)

    prompt = PromptTemplate.from_template(
        "You are the Amygdala of an AI system. Your ONLY job is to evaluate if the "
        "user's input is a critical threat, an urgent interrupt (e.g. 'STOP', 'DELETE NOW'), "
        "or requires an immediate reflex response.\n\n"
        "User Input: {input}"
    )

    chain = prompt | structured_llm
    result = chain.invoke({"input": state.get("user_input", "")})

    return {
        "is_urgent": result.is_urgent,
        "final_response": result.immediate_action if result.is_urgent else "",
    }
