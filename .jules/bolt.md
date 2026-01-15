# Bolt's Journal

## Critical Learnings

## 2024-05-22 - [Supabase Storage N+1]
**Learning:** `refreshMetrics` was fetching storage listings sequentially for each game folder, causing significant delays proportional to the number of games.
**Action:** Use `Promise.all` to fetch storage listings in parallel when aggregating stats across multiple folders.
