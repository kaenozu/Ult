import os
from pathlib import Path

def generate_tree(dir_path: Path, prefix: str = "", ignore_list: list = None):
    if ignore_list is None:
        ignore_list = ['.git', '__pycache__', 'node_modules', '.next', 'venv', '.gemini', 'tmp', 'coverage', 'build', 'dist']
    
    tree_str = ""
    
    try:
        # Get list of files and dirs, sorted
        entries = sorted(list(dir_path.iterdir()), key=lambda x: (not x.is_dir(), x.name.lower()))
        
        # Filter out ignored
        entries = [e for e in entries if e.name not in ignore_list and not e.name.startswith('.')]
        
        for i, entry in enumerate(entries):
            is_last = (i == len(entries) - 1)
            connector = "└── " if is_last else "├── "
            
            tree_str += f"{prefix}{connector}{entry.name}\n"
            
            if entry.is_dir():
                extension = "    " if is_last else "│   "
                tree_str += generate_tree(entry, prefix + extension, ignore_list)
                
    except PermissionError:
        pass
        
    return tree_str

def main():
    root_dir = Path.cwd()
    codemap_path = root_dir / "CODEMAP.md"
    
    print(f"Generating CODEMAP.md for {root_dir}...")
    
    tree_content = "# Project CodeMap\n\n"
    tree_content += f"Generated on: {os.path.basename(root_dir)}\n\n"
    tree_content += "```\n"
    tree_content += generate_tree(root_dir)
    tree_content += "```\n"
    
    with open(codemap_path, "w", encoding="utf-8") as f:
        f.write(tree_content)
        
    print(f"Successfully generated {codemap_path}")

if __name__ == "__main__":
    main()
