#!/usr/bin/env python3
import os
import subprocess
from datetime import datetime

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUTPUT_FILE = os.path.join(ROOT_DIR, "session_checkpoint.md")

def run_git_cmd(args):
    try:
        result = subprocess.run(["git"] + args, cwd=ROOT_DIR, capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except Exception as e:
        return f"Error running git command: {e}"

def main():
    print("Generating session checkpoint...")
    
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    branch = run_git_cmd(["rev-parse", "--abbrev-ref", "HEAD"])
    status = run_git_cmd(["status", "-s"])
    recent_commits = run_git_cmd(["log", "-n", "5", "--oneline"])
    
    modified_files = []
    untracked_files = []
    
    if status and "Error" not in status:
        for line in status.splitlines():
            line = line.strip()
            if not line:
                continue
            parts = line.split(" ", 1)
            state = parts[0]
            filename = parts[1].strip() if len(parts) > 1 else ""
            if not filename:
                continue
            if state == "??" or state == "A":
                untracked_files.append(filename)
            else:
                modified_files.append(filename)

    checkpoint_content = f"""# 📍 Session Checkpoint

* **Oluşturulma Tarihi:** {now_str}
* **Git Branch:** `{branch}`

---

## 🔍 Mevcut Durum (Git Status)

### 🛠️ Değiştirilen Dosyalar (Modified Files)
{chr(10).join([f"- [{f}](file://{os.path.join(ROOT_DIR, f)})" for f in modified_files]) if modified_files else "Değişiklik yok."}

### 🆕 Yeni Eklenen Dosyalar (Untracked Files)
{chr(10).join([f"- [{f}](file://{os.path.join(ROOT_DIR, f)})" for f in untracked_files]) if untracked_files else "Yeni dosya yok."}

---

## 📜 Son Yapılan Commit'ler (Recent Commits)
```plaintext
{recent_commits}
```

---

## 🎯 Sonraki Adımlar (Next Steps & Decisions)
<!-- Bu alan yapay zeka tarafından compression workflow esnasında doldurulacaktır -->
- [ ] 
- [ ] 

---

## 💡 Yeni Chat Başlatma Yönergesi
Yeni bir sohbet oturumu açıp aşağıdaki metni yapay zekaya vererek devam edebilirsiniz:
```plaintext
Merhaba, projem üzerinde çalışmaya devam ediyoruz. Önceki oturumun durumunu içeren session_checkpoint.md dosyası kök dizinde bulunmaktadır. Lütfen bu dosyayı okuyup kaldığın yerden devam et.
```
"""

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(checkpoint_content)

    print(f"Successfully generated checkpoint file: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
