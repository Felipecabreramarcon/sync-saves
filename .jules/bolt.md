# Bolt's Journal

## Critical Learnings

## 2026-01-21 - ISO Date Sorting Performance
**Learning:** Sorting arrays of objects by ISO 8601 date strings using `new Date().getTime()` creates excessive garbage collection overhead (O(N log N) allocations).
**Action:** Always use `localeCompare()` for sorting ISO 8601 date strings to avoid object creation.
