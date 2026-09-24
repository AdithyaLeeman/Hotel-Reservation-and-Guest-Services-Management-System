# docs/16 — Git Workflow

## Branch Strategy

```
main        stable, accepted work (merged from develop at integration checkpoints)
develop     integration branch (all PRs merge here)
feat/PXX-MXX-short-description    feature branches
fix/PXX-MXX-short-description     bug fix branches
```

## Task Branch Naming

Format: `feat/P{phase}-M{member}-{short-description}`

Examples:
- `feat/P01-M01-T01-db-pool`
- `feat/P03-M03-T03-create-reservation-sp`
- `fix/P04-M04-T03-checkin-race-condition`

One task branch per task. Do not put multiple tasks on one branch.

## Creating Your Worktree (Preferred)

```bash
# From the main repo directory:
git worktree add worktrees/member-1 feat/P01-M01-T01-db-pool
cd worktrees/member-1
```

## Alternative: Separate Clone

```bash
git clone <remote-url> hrgsms-member-1
cd hrgsms-member-1
git checkout -b feat/P01-M01-T01-db-pool
```

## Before Starting a Task

```bash
git fetch origin
git checkout develop
git pull origin develop
git checkout -b feat/PXX-MXX-short-description
```

## Committing

```bash
git add <files>
git commit -m "P01-M01-T01: Set up pg Pool and migration runner"
```

Commit message format: `{TASK_ID}: {short description}`

## Manual Push Handoff (REQUIRED — Agents Do Not Push)

When work is ready, Claude prepares a handoff like this:

```
Remote: origin (https://github.com/AdithyaLeeman/Hotel-Reservation-and-Guest-Services-Management-System)
Local branch: feat/P01-M01-T01-db-pool
Remote branch: feat/P01-M01-T01-db-pool (new)
Commits: [list of commit hashes and messages]
Files changed: [list]
Tests run: [results]
Known risks: [any]
Push command: git push -u origin feat/P01-M01-T01-db-pool
```

The human member reviews and runs the command manually. Claude does not push.

## Pull Request Template

Every PR must include:
- [ ] Task IDs and requirement IDs
- [ ] Database/migration changes and order
- [ ] Backend/API changes
- [ ] Frontend changes
- [ ] Tests run and results
- [ ] Screenshots when UI changes
- [ ] Security/RBAC impact
- [ ] Documentation updated
- [ ] Dependencies and merge order
- [ ] Rollback notes when relevant
- [ ] Confirmation: "I manually reviewed and pushed these commits"

## Resolving Migration Conflicts

If two members independently created migrations with overlapping sequence numbers:
1. Do NOT rewrite already-merged migrations
2. Create a new migration with the next available task-based name
3. Update `database/migrations/manifest.md` with the corrected order
4. Document the conflict and resolution in the manifest

## Merge Order

PRs merge into `develop`. Never merge directly to `main`.
`main` is updated from `develop` only at documented integration checkpoints (CP1–CP6).
Integration owner confirms merge order matches migration dependency order.

## ABSOLUTE BAN: NO AGENT PUSHES

Claude agents must never execute `git push` or any remote write. See `AGENTS.md` Section 13.
