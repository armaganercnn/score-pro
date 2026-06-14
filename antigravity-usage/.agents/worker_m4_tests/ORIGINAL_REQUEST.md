## 2026-06-14T05:30:14Z

You are Worker for Milestone 4 (Comprehensive 4-Tier Test Cases).
Your working directory is /Users/armaganercan/.gemini/antigravity/scratch/antigravity-usage/.agents/worker_m4_tests/.
Your task is to write a comprehensive test file tests/test_e2e_tiers.py implementing the 4-tier testing strategy.

The test file must contain the following test cases (totaling 61 test cases):

## 1. Feature 1: Model Settings Parsing & Normalization (R1)
- Tier 1 (Feature Coverage):
  - test_r1_flash_high_parsed: Settings change to "Gemini 3.5 Flash (High)". Database turn and session contains exactly "Gemini 3.5 Flash (High)".
  - test_r1_flash_medium_parsed: Settings change to "Gemini 3.5 Flash (Medium)". Database turn and session contains exactly "Gemini 3.5 Flash (Medium)".
  - test_r1_other_models_parsed: Settings change to Claude Sonnet 4.6 (Thinking), GPT-OSS 120B (Medium), Gemini 3.1 Pro (High).
  - test_r1_ui_normalization: GET /api/data returns normalized model names.
  - test_r1_ui_display_names: Fetch / and verify that model selection chips display Names like 'gemini-3.5-flash-medium' or 'flash-medium'.
- Tier 2 (Boundary & Corner Cases):
  - test_r1_invalid_model_fallback: Settings change to unknown model name (e.g. "Gemini X") defaults to "Gemini 3.5 Flash (Medium)".
  - test_r1_unsupported_model_fallback: Settings change to empty or period "." defaults to fallback.
  - test_r1_empty_settings_block: Empty settings change block does not crash and defaults.
  - test_r1_multiple_settings_changes: Multiple model setting changes in the same session (medium -> high -> medium) records correct model for each turn.
  - test_r1_decimals_cutoff_fix: Verify decimal model names (e.g. "Gemini 3.5 Flash (High)") are not cut off to "Gemini 3" or "Gemini 3.5".

## 2. Feature 2: Cache Creation and Read Logic (R2)
- Tier 1 (Feature Coverage):
  - test_r2_first_turn_cache_creation: Turn 1 of new session has cache_creation_tokens = input_tokens.
  - test_r2_subsequent_turn_cache_creation_zero: Turn 2 of session has cache_creation_tokens = 0.
  - test_r2_subsequent_turn_cache_read_non_zero: Turn 2 of session has cache_read_tokens > 0.
  - test_r2_new_session_resets_cache: Starting new session resets cache creation to input tokens.
  - test_r2_cache_totals_in_db: Sessions table total_cache_creation/read match turn sums.
- Tier 2 (Boundary & Corner Cases):
  - test_r2_zero_input_tokens: Turn with 0 input tokens has 0 cache creation/read.
  - test_r2_extremely_large_input_tokens: Large inputs handled without overflow or db crash.
  - test_r2_single_turn_session: Single turn session has cache creation = input, cache read = 0.
  - test_r2_caching_with_model_change: Subsequent turns have cache creation = 0 even if model changes.
  - test_r2_malformed_json_skips_turn: Parser skips bad lines but orders subsequent turns correctly.

## 3. Feature 3: Cost Calculation Formulas (R2)
- Tier 1 (Feature Coverage):
  - test_r3_cli_cost_calculation: Cost printed by CLI today/week/stats matches new cost formula.
  - test_r3_api_cost_calculation: Cost returned by /api/data matches new formula.
  - test_r3_cost_calculation_details: Specific inputs/outputs/cache values yield correct computed cost.
  - test_r3_cli_pricing_fallback: Unknown model uses Gemini 3.5 Flash (Medium) pricing in CLI.
  - test_r3_api_pricing_fallback: Unknown model uses Gemini 3.5 Flash (Medium) pricing in API.
- Tier 2 (Boundary & Corner Cases):
  - test_r3_zero_tokens_cost: 0 tokens yields $0.00 cost.
  - test_r3_only_output_tokens_cost: Only output tokens charges output rate (no input charges).
  - test_r3_cache_read_exceeds_input: Large cache read priced at 0.1x base rate.
  - test_r3_base_rate_multipliers: Cache write multiplier 1.25x and cache read multiplier 0.1x are exactly applied.
  - test_r3_cost_formatting: Cost format < $1 has 4 decimals, >= $1 has 2 decimals.

## 4. Feature 4: Date Range Filters (+1 day offset) (R3)
- Tier 1 (Feature Coverage):
  - test_r4_cli_week_range: week command displays 8 days of data (today - 7 days to today).
  - test_r4_ui_cutoff_date_javascript: Check that javascript source code in / index page contains cutoff date subtract days + 1 calculation.
  - test_r4_ui_7d_filter_shows_8d: Verify that selecting 7d in UI includes 8 days of logs.
  - test_r4_ui_30d_filter_shows_31d: Verify that selecting 30d in UI includes 31 days of logs.
  - test_r4_ui_90d_filter_shows_91d: Verify that selecting 90d in UI includes 91 days of logs.
- Tier 2 (Boundary & Corner Cases):
  - test_r4_timezone_offset_handling: Verify logs on the boundary of the offset day are correctly captured.
  - test_r4_no_data_empty_range: Empty results handled cleanly when range has no logs.
  - test_r4_all_range_no_cutoff: Selecting "All" has no date filter cutoff.
  - test_r4_future_logs_handling: Future logs are handled cleanly.
  - test_r4_single_day_log: Works when only a single day has logs.

## 5. Feature 5: UI Theme, Spacing, and Card Grid (R4)
- Tier 1 (Feature Coverage):
  - test_r5_theme_colors: Fetch / and verify slate background (#0b0f19 / #151b2c) and blue/cyan accents (#38bdf8 / #3b82f6) are present in CSS.
  - test_r5_grid_columns: Verify grid-template-columns has repeat(7, 1fr) for stats grid.
  - test_r5_reduced_paddings: Verify card padding 16px and component spacing 20px in CSS.
  - test_r5_chart_heights: Verify large chart height 290px and medium chart height 240px in CSS.
  - test_r5_stats_grid_merged: Verify stats cards are merged into a single grid.
- Tier 2 (Boundary & Corner Cases):
  - test_r5_no_orange_theme_variables: Orange variables (accent colors) are removed from CSS variables.
  - test_r5_responsive_columns: Check media queries for stats grid to ensure responsiveness.
  - test_r5_chart_canvas_responsive: Check canvas responsive option is set to true in script.
  - test_r5_outfit_font_import: Check Outfit font is imported.
  - test_r5_no_orange_card_border: Card borders do not have orange color.

## 6. Tier 3: Cross-Feature Combinations (Pairwise Combinations)
- test_tier3_pairwise_r1_r2: Model Settings Decimal + Caching (settings change to Gemini 3.5 Flash (High) and caching Turn 1 & 2 logic).
- test_tier3_pairwise_r1_r3: Model Selection + Date Range UI filtering (chip filtering with date cutoff).
- test_tier3_pairwise_r2_r3: Caching + Date Range aggregation.
- test_tier3_pairwise_r2_r5: Caching + UI theme/color chart mapping (verify color-cache-read/write colors exist).
- test_tier3_pairwise_r3_r5: Date Range + UI active chip theme/color styling.

## 7. Tier 4: Real-World Application Scenarios (Workloads)
- test_tier4_scenario_1_full_scan_report: Full scan multiple sessions and verify CLI stats output matches expected.
- test_tier4_scenario_2_incremental_scan: Artımlı tarama (delta scan) works when new turns are appended.
- test_tier4_scenario_3_multi_model_transition: Verify multi-model turns calculate correct per-model costs.
- test_tier4_scenario_4_cache_heavy_long_session: Verify caching across 10-turn long session.
- test_tier4_scenario_5_multi_project_analysis: Verify project names parsed from Cwd args are grouped in API data.
- test_tier4_scenario_6_interactive_dashboard_flow: Server lifecycle with API data updates via /api/scan requests.
