# Bolt's Journal

## Critical Learnings

## 2025-02-18 - Zustand Performance Anti-Pattern
**Learning:** Using `const { prop } = useStore()` without a selector subscribes the component to the ENTIRE store state. This causes re-renders whenever ANY part of the store updates, even if `prop` hasn't changed.
**Action:** Always use selectors `const prop = useStore(state => state.prop)` or `useShallow` for object slices `const { prop } = useStore(useShallow(state => ({ prop: state.prop })))`.
