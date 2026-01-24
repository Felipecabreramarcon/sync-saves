# Bolt's Journal

## Critical Learnings

## 2026-01-24 - N+1 Storage Bucket Scanning
**Learning:** The application was iterating through every folder in the 'saves' storage bucket and listing files for each one to calculate total storage usage. This is a classic N+1 problem that scales poorly with the number of games (O(N) network requests).
**Action:** Replaced iterative storage calls with a single Supabase database query joining `save_versions` and `games` (O(1) request).
