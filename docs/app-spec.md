# App Spec: formula-finder

## 1) App Overview
- **App Name:** Formula Finder
- **Category:** Knowledge / Reference
- **Version:** V1
- **App Type:** DB-backed
- **Purpose:** Help an authenticated user store, browse, and organize formulas with subjects, topics, notes, and examples.
- **Primary User:** A signed-in user maintaining a personal formula workspace.

## 2) User Stories
- As a user, I want to save a formula with expression and variable notes, so that I can reference it later.
- As a user, I want to filter formulas by subject, topic, and favorites, so that I can find what I need quickly.
- As a user, I want to archive and restore formulas, so that I can preserve old material without deleting it.

## 3) Core Workflow
1. User signs in and opens `/app`.
2. User creates a formula from the drawer or edits an existing one.
3. App writes the formula to the user-scoped database through API endpoints and refreshes the workspace list.
4. User opens the formula detail route or manages favorite/archive state from the workspace.
5. User searches and filters by subject and topic as the library grows.

## 4) Functional Behavior
- Formulas are persisted per user with title, expression, subject, topic, variables, notes, and optional example text.
- The workspace supports create, edit, favorite toggle, archive, restore, search, and filtering.
- `/app`, API endpoints, and detail routes are protected by authentication and ownership checks.
- Current implementation is a personal formula library, not a calculator or symbolic solver.

## 5) Data & Storage
- **Storage type:** Astro DB on the app’s isolated Turso database
- **Main entities:** Formulas
- **Persistence expectations:** User-owned formulas persist across refresh and future sessions.
- **User model:** Multi-user shared infrastructure with per-user isolation

## 6) Special Logic (Optional)
- Subject values are constrained to a known set (`math`, `physics`, `chemistry`, `statistics`, `finance`, `custom`) in the current implementation.
- Workspace summary highlights active, favorite, archived, recently updated, and subject-count metrics.

## 7) Edge Cases & Error Handling
- Invalid IDs/routes: Invalid or missing formula routes should fail safely without exposing data.
- Empty input: Title and expression are required before save.
- Unauthorized access: Protected routes and API endpoints require a valid signed-in user.
- Missing records: Missing or non-owned formulas should resolve to safe not-found behavior.
- Invalid payload/state: Unsupported subject or malformed payload values are rejected by the app logic.

## 8) Tester Verification Guide
### Core flow tests
- [ ] Create a formula with expression, subject, topic, and notes, then confirm it appears in the workspace and detail view.
- [ ] Edit the formula, toggle favorite, archive it, then restore it and confirm the workspace refreshes correctly.

### Safety tests
- [ ] Open a missing or invalid formula detail route and confirm the app fails safely.
- [ ] Attempt to save without a title or expression and confirm the request is rejected.
- [ ] Confirm subject/topic filtering does not expose another user’s records.

### Negative tests
- [ ] Confirm the app does not perform symbolic solving or numeric calculation in V1.
- [ ] Confirm there is no permanent delete flow in the current implementation.

## 9) Out of Scope (V1)
- Solver or calculator behavior
- Shared/team formula libraries
- Permanent delete and restore history beyond archive state

## 10) Freeze Notes
- V1 release freeze: this document reflects the current repo implementation before final browser verification.
- This spec is based on current pages, stores, and API behavior; route safety and exact runtime responses should be confirmed in freeze verification.
- During freeze, only verification fixes and cleanup are allowed; no undocumented feature expansion.
