#!/usr/bin/env python3
import os
import re
import json

WIKI_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".wiki"))
OUTPUT_FILE = os.path.join(WIKI_DIR, "wiki_index.json")

def parse_yaml_manually(yaml_str):
    data = {}
    for line in yaml_str.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if ":" in line:
            parts = line.split(":", 1)
            key = parts[0].strip()
            val = parts[1].strip()
            # Remove enclosing quotes if present
            if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                val = val[1:-1]
            data[key] = val
    return data

def parse_markdown_file(filepath, relative_path):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Parse YAML frontmatter
    frontmatter = {}
    fm_match = re.match(r"^---\s*\n(.*?)\n---\s*\n", content, re.DOTALL)
    if fm_match:
        try:
            frontmatter = parse_yaml_manually(fm_match.group(1))
        except Exception as e:
            print(f"Error parsing frontmatter in {relative_path}: {e}")

    # Extract Obsidian links [[link]]
    links = []
    # Match double brackets but ignore if it contains a label separator |
    link_matches = re.findall(r"\[\[(.*?)\]\]", content)
    for link in link_matches:
        # If it has a label like [[path|label]], extract the path
        clean_link = link.split("|")[0].strip()
        if clean_link not in links:
            links.append(clean_link)

    # Extract Code References [text](file://...)
    code_refs = []
    code_matches = re.findall(r"\[([^\]]+)\]\((file:///[^\)]+)\)", content)
    for name, uri in code_matches:
        code_refs.append({
            "name": name,
            "uri": uri
        })

    return {
        "id": frontmatter.get("id", ""),
        "title": frontmatter.get("title", ""),
        "status": frontmatter.get("status", ""),
        "created_at": frontmatter.get("created_at", ""),
        "updated_at": frontmatter.get("updated_at", ""),
        "links": links,
        "code_refs": code_refs
    }

def main():
    if not os.path.exists(WIKI_DIR):
        print(f"Wiki directory does not exist: {WIKI_DIR}")
        return

    wiki_index = {
        "files": {},
        "graph": {}
    }

    exclude_files = {"index.md", "log.md", "wiki_schema.md", "wiki_index.json"}

    for root, _, files in os.walk(WIKI_DIR):
        for file in files:
            if file.endswith(".md") and file not in exclude_files:
                abs_path = os.path.join(root, file)
                rel_path = os.path.relpath(abs_path, WIKI_DIR)
                
                try:
                    data = parse_markdown_file(abs_path, rel_path)
                    wiki_index["files"][rel_path] = data
                    
                    # Add to graph mapping if id is defined
                    page_id = data["id"] or os.path.splitext(file)[0]
                    # Map dependencies/links to their target IDs or basenames
                    target_links = []
                    for link in data["links"]:
                        target_basename = os.path.basename(link)
                        target_links.append(target_basename)
                    
                    wiki_index["graph"][page_id] = target_links
                except Exception as e:
                    print(f"Failed to process {rel_path}: {e}")

    # Write to output file
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(wiki_index, f, indent=2, ensure_ascii=False)

    print(f"Successfully compiled wiki index to {OUTPUT_FILE}")
    print(f"Total files indexed: {len(wiki_index['files'])}")

if __name__ == "__main__":
    main()
