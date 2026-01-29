# Bolt's Journal

## Critical Learnings

## 2024-05-22 - ISO 8601 Sorting Optimization
**Learning:** Parsing ISO 8601 strings into Date objects (`new Date().getTime()`) for sorting is significantly slower (~94% in benchmarks) than direct string comparison (`a > b`). Since ISO 8601 strings are lexicographically sortable, the Date parsing overhead is unnecessary.
**Action:** Always prefer string comparison for sorting standard ISO date strings in hot paths like lists or large datasets.
