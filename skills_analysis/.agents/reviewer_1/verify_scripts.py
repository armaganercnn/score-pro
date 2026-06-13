import re
import ast

def verify_markdown_code_blocks(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # regex to find python code blocks
    # patterns like ```python\n...\n```
    pattern = re.compile(r'```python\n(.*?)\n```', re.DOTALL)
    code_blocks = pattern.findall(content)
    
    print(f"Found {len(code_blocks)} Python code blocks.")
    for idx, block in enumerate(code_blocks, 1):
        try:
            ast.parse(block)
            print(f"Block {idx}: Valid Python code.")
        except SyntaxError as e:
            print(f"Block {idx}: Syntax Error: {e}")
            print("--- Block Content ---")
            print(block)
            print("---------------------")

if __name__ == '__main__':
    verify_markdown_code_blocks('/Users/armaganercan/.gemini/antigravity/scratch/skills_analysis/skills_analysis_report.md')
