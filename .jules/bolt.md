# Bolt's Journal

## Critical Learnings

## 2023-10-27 - [Date Sorting Optimization]
**Learning:** ISO 8601 date strings can be sorted lexicographically using `localeCompare` or simple string comparison. Parsing them to `Date` objects in a sort comparator (`new Date(b).getTime() - new Date(a).getTime()`) is significantly slower (approx 10x slower) due to object allocation overhead.
**Action:** Always prefer string comparison for sorting ISO date strings. Use `localeCompare` for safety and locale correctness, or simple comparison for raw speed if format is strictly guaranteed.
