#!/usr/bin/env python3
import os
import re
import json

AGENTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SKILLS_DIR = os.path.join(AGENTS_DIR, "skills")
OUTPUT_FILE = os.path.join(AGENTS_DIR, "skills_manifest.json")

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

def parse_skill_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Parse YAML frontmatter
    frontmatter = {}
    fm_match = re.match(r"^---\s*\n(.*?)\n---\s*\n", content, re.DOTALL)
    if fm_match:
        try:
            frontmatter = parse_yaml_manually(fm_match.group(1))
        except Exception as e:
            print(f"Error parsing frontmatter in {filepath}: {e}")

    return {
        "name": frontmatter.get("name", ""),
        "description": frontmatter.get("description", ""),
        "when_to_use": frontmatter.get("when_to_use", ""),
        "allowed_tools": frontmatter.get("allowed-tools", "") or frontmatter.get("allowed_tools", "")
    }

def main():
    if not os.path.exists(SKILLS_DIR):
        print(f"Skills directory does not exist: {SKILLS_DIR}")
        return

    manifest = {
        "skills": []
    }

    # Traverse all directories in SKILLS_DIR
    for folder in sorted(os.listdir(SKILLS_DIR)):
        folder_path = os.path.join(SKILLS_DIR, folder)
        if os.path.isdir(folder_path):
            skill_file = os.path.join(folder_path, "SKILL.md")
            if os.path.exists(skill_file):
                try:
                    data = parse_skill_file(skill_file)
                    # Use folder name as fallback name
                    if not data["name"]:
                        data["name"] = folder
                    data["path"] = f".agents/skills/{folder}/SKILL.md"
                    manifest["skills"].append(data)
                except Exception as e:
                    print(f"Failed to parse skill in {folder}: {e}")

    # Write to output file
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    print(f"Successfully compiled skills manifest to {OUTPUT_FILE}")
    print(f"Total skills indexed: {len(manifest['skills'])}")

if __name__ == "__main__":
    main()
