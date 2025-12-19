from langgraph.graph import StateGraph, START, END
from .state import AgentState
from .nodes import perception_node, wellness_logic_node, generation_node

def create_workflow():
    workflow = StateGraph(AgentState)

    # Add Nodes
    workflow.add_node("perception", perception_node)
    workflow.add_node("wellness", wellness_logic_node)
    workflow.add_node("generator", generation_node)

    # Add Edges
    workflow.add_edge(START, "perception")
    workflow.add_edge("perception", "wellness")
    workflow.add_edge("wellness", "generator")
    workflow.add_edge("generator", END)

    return workflow.compile()

app_workflow = create_workflow()
