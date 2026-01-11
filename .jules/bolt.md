# Bolt's Journal

## Critical Learnings

## 2025-02-19 - Missing Dependencies & Memoization Pattern
**Learning:** The project relies on `clsx` and `tailwind-merge` in utility files but they were missing from `package.json`. Also, `pnpm lint` is configured but `eslint` is missing from dependencies.
**Action:** Always run `pnpm install` and check for missing types/dependencies before assuming `typecheck` will work. When optimizing React components, look for derived state calculations inside the render loop that involve array methods like `filter`, `sort`, `slice`, `map` and move them to `useMemo`.
