import os
import re

def fix_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace `[[something]]` with [[something]] (remove backticks around links)
    # Also replace `[[folder/something]]` with [[folder/something]]
    new_content = re.sub(r'`(\[\[[^`\]]+\]\])`', r'\1', content)
    
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Fixed links in: {file_path}")

def walk_and_fix(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.md'):
                fix_file(os.path.join(root, file))

if __name__ == "__main__":
    wiki_dir = "/Users/armaganercan/antigravity/diagram-studio/.wiki"
    walk_and_fix(wiki_dir)
