# Execution Plan - Follow-up Table Update

## Milestones & Tasks

### Milestone 1: Exploration
- Examine the layout, styling, and JavaScript logic of the Sessions table in `dashboard.py`.
- Identify elements to modify: CSS grid/max-width for container and `.table-card`, table headers structure, JavaScript table rendering logic for both parent (`parent-row`) and child (`child-row`) rows.
- Verify existing tests and plan how to write unit tests / E2E tests for the new column layout.

### Milestone 2: Implementation
- Modify CSS in `dashboard.py` to:
  - Expand container's maximum width or allow `.table-card` to scale cleanly to full width.
  - Fix any layout overlaps and adjust column widths.
- Modify HTML table headers in `dashboard.py`:
  - Enumerate the 11 columns in the correct order: Session, Project, Last Active, Duration, Model, Turns, Input, Cache Read, Cache Creation, Output, Cost.
  - Add descriptive tooltips with info icons (`.info-icon` / `.tooltip-text`) for each new column header:
    - Input: "Asistana gönderilen toplam girdi token sayısı (önbellek yazma hariç)."
    - Cache Read: "İstek önbelleğinden (context caching) okunan ve indirimli faturalandırılan token sayısı."
    - Cache Creation: "Önbelleğe ilk kez yazılan ve sonraki dönüşlerde okunabilecek bağlam token sayısı."
    - Output: "Asistanın ürettiği toplam çıktı token sayısı."
- Modify JavaScript rendering in `dashboard.py`:
  - Render the parent rows with 11 cells mapping to the 11 columns.
  - Render the child rows (subagent rows) with 11 cells matching the same column structure.
  - Ensure correct variable names: `s.displayInput` / `c.input`, `s.displayCacheRead` / `c.cache_read`, `s.displayCacheCreation` / `c.cache_creation`, `s.displayOutput` / `c.output` are rendered in their separate columns.

### Milestone 3: Verification
- Verify compilation and execution of `dashboard.py`.
- Run E2E test suite to verify dashboard functionality.
- Write new E2E or unit tests to verify the new table columns and tooltips.
- Audit the implementation using the Forensic Auditor tool.
