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
    
    args = parser.parse_args()
    
    instruction = args.instruction
    
    result_data = {
        "instruction": instruction,
        "executed": False,
        "output": "",
        "error": ""
    }

    try:
        # We use shell=True to ensure the 'opencode' command is resolved correctly 
        # (especially if it's a .ps1 or alias on Windows).
        # We wrap the instruction in quotes to handle spaces safely in the shell string.
        # Note: simplistic quoting; strictly speaking should escape inner quotes if heavily used.
        safe_instruction = instruction.replace('"', '\\"')
        command = f'opencode run "{safe_instruction}"'
        
        # Run the command
        # Using utf-8 encoding for output capture
        process = subprocess.run(
            command, 
            shell=True, 
            capture_output=True, 
            text=True, 
            encoding='utf-8',
            errors='replace' # Handle potential encoding errors gracefully
        )
        
        result_data["executed"] = True
        result_data["output"] = process.stdout
        result_data["error"] = process.stderr
        result_data["returncode"] = process.returncode
        
        # If opencode itself outputs JSON, we might want to parse it?
        # For now, treat as raw text.
        
    except Exception as e:
        result_data["error"] = str(e)

    # Print JSON output for the agent
    print(json.dumps(result_data, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
