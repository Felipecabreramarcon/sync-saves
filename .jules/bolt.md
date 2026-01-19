# Bolt's Journal

## Critical Learnings

## 2024-05-22 - [Zustand Selector Optimization]
**Learning:** `useGamesStore()` without a selector subscribes components to the *entire* store state. In `RecentActivity`, this caused re-renders whenever unrelated state (like loading flags or other lists) changed.
**Action:** Always use granular selectors with `useShallow` for array/object slices: `useStore(useShallow(state => state.slice))`.

## 2024-05-22 - [Date Sorting Overhead]
**Learning:** Sorting ISO 8601 strings by creating `new Date()` objects (`new Date(b).getTime() - new Date(a).getTime()`) adds significant allocation overhead (O(N) objects) in hot paths.
**Action:** Use string comparison `b.localeCompare(a)` for ISO strings, which is allocation-free and faster.
