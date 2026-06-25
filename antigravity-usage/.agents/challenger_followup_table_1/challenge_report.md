## Challenge Summary

**Overall risk assessment**: HIGH

## Challenges

### [High] Challenge 1: Orphaned Child Sessions in Sessions Table

- **Assumption challenged**: The assumption that if a parent session ID exists in the database (`rawData.sessions`), the parent session itself is visible and rendered in the dashboard.
- **Attack scenario**: A user filters by a date range (e.g., 3 days) or specific models. A child session matches the filter (e.g., created today, using Gemini 3.5 Flash), but its parent session is filtered out (e.g., created 10 days ago, or using Claude Sonnet). Because the parent session exists in `rawData.sessions` (which is unfiltered), `sessionMap[parent_id]` is truthy, so the child is excluded from `rootSessions`. However, since the parent failed the filter check, it is not in `filteredSessions` and is not rendered in the table. Consequently, the child session completely disappears from the UI's Sessions Table and the Sessions count card.
- **Blast radius**: The user is presented with incorrect data: the top metrics cards (total tokens, cost, turns, etc.) sum over `filteredSessions` (which includes the child), but the Sessions Table is empty/missing this child, and the sessions count card shows a discrepancy.
- **Mitigation**: Update the `rootSessions` filtering logic in the JS frontend to check if the parent session ID is in the set of *filtered* session IDs rather than checking the global `sessionMap` which contains all unfiltered database records:
  ```javascript
  const filteredSessionIds = new Set(filteredSessions.map(s => s.session_id_full));
  const rootSessions = filteredSessions.filter(s => !s.parent_session_id || !filteredSessionIds.has(s.parent_session_id));
  ```

### [Medium] Challenge 2: Grandchild Sessions Hidden (Flat 2-Level Rendering Limitation)

- **Assumption challenged**: That the session hierarchy is strictly 2 levels deep (parent and direct children).
- **Attack scenario**: The SQLite database allows arbitrary nesting of sessions (`parent_session_id`). `tests/test_scanner_logic.py` and `tests/test_sessions_table.py` explicitly test and handle a 3-level hierarchy (`root -> child -> grandchild`). However, in `dashboard.py`'s JavaScript:
  - The rendering loop only iterates through `s.children` (direct children) to append `.child-row` elements.
  - Grandchildren (`child.children`) are never traversed or rendered.
  - Because grandchildren have `parent_session_id` pointing to `child` (which exists in `sessionMap`), they are excluded from `rootSessions`.
  - Consequently, grandchildren are completely omitted from the UI, and their individual metrics (turns, cost, tokens) are not displayed anywhere in the table.
- **Blast radius**: Data omission in the Sessions Table for any session deeper than level 2, despite being fully parsed and stored in the database.
- **Mitigation**: Implement recursive child rendering or flatten the tree display for deeper levels, and ensure child row metrics aggregate grandchildren metrics if grandchildren are not explicitly rendered.

### [Low] Challenge 3: Incorrect Date Range Cutoff Offset (+1 Day logic creates 5-day ranges for 3-day selections)

- **Assumption challenged**: That subtracting `(days + 1)` correctly implements a `days` range.
- **Attack scenario**: In `updateDashboard()`:
  ```javascript
  cutoffDate.setDate(maxDate.getDate() - (days + 1));
  ```
  For a 3-day selection (`selectedRange = '3d'`), `days = 3`. `cutoffDate` becomes `maxDate - 4 days`. If the maximum log date is `2026-06-25`, the cutoff is `2026-06-21`. The daily chart and filtered sessions include all data starting from `2026-06-21` (inclusive) to `2026-06-25` (inclusive), which comprises 5 calendar days of data (`21, 22, 23, 24, 25`) instead of 3 days.
- **Blast radius**: UI chart and tables display up to 2 extra days of usage, mismatching the selected range description.
- **Mitigation**: Adjust cutoff calculation to accurately encompass the requested number of days (e.g., `maxDate - (days - 1)` or similar depending on inclusion rules).

## Stress Test Results

- **Orphaned Child Session Filtering** → Parent older than cutoff, Child within cutoff → Child should be rendered as root row in table → **FAIL** (Child session is not rendered at all, causing metrics card vs table discrepancy).
- **Multi-Level Session Nesting** → Root -> Child -> Grandchild hierarchy → Grandchild should be rendered or aggregated → **FAIL** (Grandchild is completely hidden from the UI sessions table).
- **Date Range Boundary Verification** → selectedRange = '3d' with max log date 2026-06-25 → Should render exactly 3 days of chart columns (23, 24, 25) → **FAIL** (Renders 5 days: 21, 22, 23, 24, 25).

## Unchallenged Areas

- **Pricing Data Schema & Cost Formulas** — Out of scope for Sessions Table display verification (though correct model prices and cost computations are used in the backend SQL/Python level).
