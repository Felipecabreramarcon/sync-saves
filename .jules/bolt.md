# Bolt's Journal

## Critical Learnings

## 2024-05-22 - ISO Date Sorting Optimization
**Learning:** This codebase heavily relies on sorting `SyncActivity` and `CloudSaveVersion` arrays by ISO 8601 `created_at` strings. Using `new Date().getTime()` for every comparison in `sort()` caused significant overhead (O(N) allocations).
**Action:** Always prefer `b.created_at.localeCompare(a.created_at)` for sorting ISO 8601 strings. It avoids object allocation and is ~2x faster in benchmarks.
