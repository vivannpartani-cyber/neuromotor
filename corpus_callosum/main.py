import sys
from dotenv import load_dotenv
from brain.callosum import corpus_callosum
from brain.hippocampus import add_memory

def print_stream(stream):
    for s in stream:
        for k, v in s.items():
            if k == "amygdala":
                print("🧠 Amygdala processing...")
                if v.get("is_urgent"):
                    print("🚨 URGENT THREAT DETECTED!")
            elif k == "hippocampus":
                print("📖 Hippocampus retrieving memories...")
            elif k == "frontal_lobe":
                print("⚙️  Frontal Lobe thinking...")
            elif k == "tools":
                print("🛠️  Frontal Lobe executing tools...")
        print("---")

def main():
    load_dotenv()
    print("========================================")
    print(" Corpus Callosum Initialized")
    print("========================================\n")
    
    # Seed some memory for demonstration
    add_memory("doc_1", "The user's name is Viv. They are an AI Architect.")
    add_memory("doc_2", "The secret launch code is ALPHA-99.")
    
    while True:
        try:
            user_input = input("\nUser > ")
            if user_input.lower() in ["quit", "exit"]:
                break
                
            state = {"user_input": user_input, "messages": []}
            
            # Execute the graph
            final_state = None
            for s in corpus_callosum.stream(state):
                print_stream([s])
                final_state = s
                
            # The final_state will contain the outputs of the last node to execute
            # Since multiple nodes can return final_response, we extract the latest one.
            # Easiest way is to fetch the full state:
            full_state = corpus_callosum.get_state({"configurable": {"thread_id": "1"}}).values if hasattr(corpus_callosum, "get_state") else None
            # Wait, since we aren't using a checkpointer here, we can just extract from the final state output directly
            node_name = list(final_state.keys())[0]
            output = final_state[node_name]
            
            print("\n🤖 Assistant >", output.get("final_response", "No response generated."))
            
        except EOFError:
            break
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    main()
