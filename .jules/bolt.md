# Bolt's Journal

## Critical Learnings

## 2024-05-22 - Nested Find in Filters
**Learning:** Found an O(N*M) performance bottleneck in `filteredActivities` where `games.find()` was called inside an `activities.filter()` loop. This is common when joining data in the frontend.
**Action:** Always hoist invariant lookups (like finding the selected game) outside of the loop. If multiple lookups are needed, create a Map (O(1) lookup) instead of using `.find()` (O(N)) inside the loop.
