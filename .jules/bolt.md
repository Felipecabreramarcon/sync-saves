# Bolt's Journal

## Critical Learnings

## 2026-02-01 - Zustand Selector Performance
**Learning:** Using `const { slice } = useStore()` triggers re-renders on *any* store update because it returns a new state object every time. Always use specific selectors `useStore(state => state.slice)` to prevent unnecessary re-renders in components that only need a subset of state.
**Action:** Audit other store usages for this pattern.
