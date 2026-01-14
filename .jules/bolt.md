# Bolt's Journal

## Critical Learnings

## 2024-05-23 - Logs Page Re-renders
**Learning:** The `Logs` page triggers frequent re-renders due to `loading` state updates during background refreshes. Since `Timeline` was not memoized, this caused the entire activity list (potentially hundreds of items) to re-render even when data didn't change.
**Action:** Always memoize list components (`Timeline`, `TimelineItem`) that are children of pages with frequent state updates (like `loading` or filters), even if the data props seem stable.
