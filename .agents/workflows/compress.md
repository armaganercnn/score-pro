---
description: Compresses session context by generating a session checkpoint file. Use in long sessions to reset context.
---

# /compress - Context Checkpoint & Session Reset

$ARGUMENTS

---

## Purpose

This command activates Context Compression mode. It gathers the current state of the git repository, modified files, and recent commits, and outputs a structured checkpoint in the project root so the user can easily start a new, low-token chat session without losing context.

---

## Behavior

When `/compress` is triggered:

1. **Run Checkpoint Generator**: Execute `python3 .agents/scripts/create_checkpoint.py` to generate or update `session_checkpoint.md` in the project root.
2. **Collect Active Context**: Analyze the active goals, decisions made, and outstanding tasks in the conversation.
3. **Inject Next Steps**: Modify `session_checkpoint.md` to list the key decisions made and the exact next steps for the project.
4. **Instruct Session Transition**: Present a clear summary and copy-paste instruction block for the user to start a new chat.

---

## Output Format

```markdown
## 📦 Context Compressed & Checkpoint Created

A structured session checkpoint has been successfully generated at [session_checkpoint.md](file://./session_checkpoint.md).

### 🔍 Summary of State:
* **Active Branch:** `[branch-name]`
* **Modified Files:** `[count]` files modified.
* **Untracked Files:** `[count]` files added.

### 🎯 Next Steps Documented:
1. [Next Step 1]
2. [Next Step 2]

---

### 💡 Ready to Reset?
Lütfen yeni bir temiz chat penceresi açın ve sohbete şu mesajı göndererek başlayın:

> Merhaba, projem üzerinde çalışmaya devam ediyoruz. Önceki oturumun durumunu içeren `session_checkpoint.md` dosyası kök dizinde bulunmaktadır. Lütfen bu dosyayı okuyup kaldığın yerden devam et.
```
