# Bolt's Journal

## Critical Learnings

## 2026-01-18 - ISO Date Sorting Optimization
**Learning:** The codebase frequently parses ISO date strings into Date objects solely for sorting (e.g., `new Date(b).getTime() - new Date(a).getTime()`). Since ISO 8601 strings are lexicographically sortable, this is an unnecessary overhead of O(N log N) allocations.
**Action:** Use `b.localeCompare(a)` for sorting ISO date strings directly.
