# docs/00 — Documentation Index

## Purpose
This document lists every project document, its authority, mandatory reading order, and where to find requirements, decisions, status, and handoffs.

## Source Precedence
1. Official Project 5 brief
2. Lecturer/TA instructions and current user instructions
3. ERD (`project-sources/ER_Diagram- Group 39.md`)
4. SRS (`project-sources/Group_39 - project_5 (1).md`)
5. Lecture notes (`project-sources/Database Lecture Notes Summary - L01-L14.md`)
6. Engineering assumptions (documented)

> **PDF verification note:** Original PDF files were not available in the repository. Only Markdown conversions are present. Visual cardinality and diagram verification was not performed. Treat ERD cardinalities as described in the Markdown transcription and flag any visual ambiguity.

## Source Materials (`project-sources/`)

| File | Authority | Verification |
|---|---|---|
| `Project 5 - Hotel Reservation and Guest Services Management System.md` | Official brief | PDF not available |
| `Group_39 - project_5 (1).md` | Group 39 SRS | PDF not available |
| `ER_Diagram- Group 39.md` | ERD (tables, enums, FKs) | PDF not available |
| `Database Lecture Notes Summary - L01-L14.md` | Course toolbox | AI-generated summary |

## Document Map

| Doc | Purpose | Authority |
|---|---|---|
| `AGENTS.md` | Development contract for all sessions | AUTHORITATIVE |
| `memory.md` | Live project state | Session state |
| `ui-registry.md` | Approved UI patterns | Living document |
| `context/01` | Project overview | Summary → links to docs |
| `context/02` | Architecture | Summary → links to docs |
| `context/03` | Build plan | Summary → links to docs |
| `context/04` | Code standards | Summary → links to docs |
| `context/05` | Library patterns | Summary → links to docs |
| `context/06` | UI tokens | Summary → links to docs |
| `context/07` | UI rules | Summary → links to docs |
| `context/08` | Progress tracker | Living snapshot |
| `docs/01` | Project description | Business requirements |
| `docs/02` | Requirements traceability matrix | Requirements → DB → API → tasks |
| `docs/03` | Course concept mapping | Academic alignment |
| `docs/04` | Architecture (detailed) | Technical decisions |
| `docs/05` | ERD and schema | DB design |
| `docs/06` | Normalization and FDs | Academic analysis |
| `docs/07` | API and pages | Endpoint contracts |
| `docs/08` | Business rules and enforcement | Rules → enforcement matrix |
| `docs/09` | DB routines, triggers, views, indexes | Routine inventory |
| `docs/10` | Seed data and expected results | Test data plan |
| `docs/11` | Security and RBAC | Auth/access matrix |
| `docs/12` | Testing and acceptance | Test plans and criteria |
| `docs/13` | Workload division | Member contributions |
| `docs/14` | Task tracker | Live task status |
| `docs/15` | Local setup | Developer onboarding |
| `docs/16` | Git workflow | Branch and PR rules |
| `docs/17` | System operation guide | Demo and usage |
| `docs/18` | Source and ERD gap analysis | Conflict resolution |
| `docs/19` | Open questions and assumptions | Unresolved decisions |
| `docs/20` | Approved libraries and patterns | Package governance |
| `docs/21` | Shared contracts | Cross-slice contracts |
| `docs/phases/` | Phase-specific work items | Phase planning |
| `docs/member-prompts/` | Member session prompts | Copy-paste prompts |
| `.agent/current-state.md` | Live phase and task state | Integration owners |
| `.agent/ownership-map.md` | File ownership | Conflict prevention |
| `.agent/decisions/` | Logged decisions | Traceability |
| `.agent/handoffs/` | Session handoffs | Continuity |

## Mandatory Reading Order (Session Start)
See `AGENTS.md` Section 3 for the complete ordered list.

## Where to Find Things

| Need | Go To |
|---|---|
| Current task status | `docs/14_task-tracker.md` |
| What phase we are in | `context/08-progress-tracker.md` |
| Who owns a file | `.agent/ownership-map.md` |
| An unresolved question | `.agent/open-questions.md` |
| A past decision | `.agent/decisions/README.md` |
| Session handoff | `.agent/handoffs/README.md` |
| API contract | `docs/07_api-and-pages.md` + `docs/21_shared-contracts.md` |
| DB schema | `docs/05_current-erd-and-schema.md` |
| DB routines | `docs/09_database-routines-triggers-views-indexes.md` |
| Business rules | `docs/08_business-rules-and-enforcement.md` |
| Security rules | `docs/11_security-and-rbac.md` |
| How to set up locally | `docs/15_local-setup.md` |
| Git workflow | `docs/16_git-workflow.md` |
