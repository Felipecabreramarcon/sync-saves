# Bolt's Journal

## Critical Learnings

## 2026-01-28 - ISO Date Sorting Performance
**Learning:** Parsing dates with `new Date()` inside a sort comparator is expensive (O(N log N) allocations). For ISO 8601 strings, direct string comparison is ~18x faster (8ms vs 150ms for 10k items) and preserves chronological order.
**Action:** Always prefer string comparison (`> <` or `localeCompare`) for ISO date sorting.
