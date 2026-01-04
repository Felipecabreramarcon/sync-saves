# Bolt's Journal

## Critical Learnings

## 2024-05-22 - [Memoizing Expensive Derived State]
**Learning:** `Dashboard.tsx` was recalculating `recentActivities` (filtering, sorting, deduping) on every render, even when unrelated state (like `storageUsage`) changed.
**Action:** Used `useMemo` to cache the result of the expensive calculation, only re-computing when `activities` changes. Always look for expensive derived state in render methods, especially when using global stores that trigger frequent updates.
