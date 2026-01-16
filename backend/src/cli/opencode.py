#!/usr/bin/env python3
"""
OpenCode Instruction CLI
Allows the AI agent to give natural language instructions to the system's 'opencode' tool.
"""

import argparse
import json
import subprocess
import sys

def main():
    parser = argparse.ArgumentParser(description="OpenCode Instruction CLI")
    parser.add_argument("instruction", help="The natural language instruction for OpenCode")
    parser.add_argument("--model", "-m", help="Model to use (e.g., openai/gpt-4o, anthropic/claude-3.5-sonnet)")
    
    args = parser.parse_args()
    
    instruction = args.instruction
    models = args.model.split(',') if args.model else [None]
    
    import concurrent.futures

    def run_single_model(model_name):
        res = {
            "model": model_name,
            "executed": False,
            "output": "",
            "error": "",
            "returncode": 0
        }
        try:
            safe_instruction = instruction.replace('"', '\\"')
            
            # Construct command based on model type
            if model_name == "local/qwen":
                # Use local 'qwen' command
                command = f'qwen "{safe_instruction}"'
            else:
                # Use default 'opencode' command
                model_flag = f'--model "{model_name}"' if model_name else ""
                command = f'opencode run {model_flag} "{safe_instruction}"'
            
            process = subprocess.run(
                command, 
                shell=True, 
                capture_output=True, 
                text=True, 
                encoding='utf-8',
                errors='replace',
                timeout=120 # Increased timeout for local models
            )
            
            res["executed"] = True
            res["output"] = process.stdout
            res["error"] = process.stderr
            res["returncode"] = process.returncode
        except Exception as e:
            res["error"] = str(e)
        return res

    results = []
    if len(models) > 1:
        # Run in parallel
        with concurrent.futures.ThreadPoolExecutor(max_workers=len(models)) as executor:
            future_to_model = {executor.submit(run_single_model, m.strip()): m for m in models}
            for future in concurrent.futures.as_completed(future_to_model):
                results.append(future.result())
    else:
        # Single model
        results.append(run_single_model(models[0]))

    # If single result, return flexible structure (backward compatibility is nice but list is cleaner for "multi")
    # To keep it simple for the agent, if list has 1 item and no explicit "multi" flag was used, maybe return object?
    # But user asked for "simultaneously", implying aggregation.
    # Let's return a wrapping object.
    
    final_output = {
        "instruction": instruction,
        "results": results
    }

    print(json.dumps(final_output, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
