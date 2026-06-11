# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repository Is

"Pots & Parliament" — a Wolfenstein 3D-style raycaster shooter satirizing Icelandic institutional dysfunction (full concept brief in `INITIAL_PROMPT.md`). **There is no source code yet.** The project is run with the AWS AI-DLC (AI-Driven Development Lifecycle) methodology and is currently mid-INCEPTION phase.

Despite the repo name, **no AWS services are used** — this was an explicit, approved requirements decision.

## The AI-DLC Workflow Governs All Development Work

Do not just start writing code. All development follows the staged workflow in `.kiro/steering/aws-aidlc-rules/core-workflow.md`, which overrides default development behavior. Stage-specific rule files live in `.kiro/aws-aidlc-rule-details/` (the resolved rule-details directory for this repo; all rule references like `common/process-overview.md` are relative to it).

### Session resume (do this first)

1. Read `aidlc-docs/aidlc-state.md` — the single source of truth for current phase/stage, completed stages, and extension configuration.
2. Load artifacts from completed stages per `common/session-continuity.md` (e.g., before User Stories work, load `requirements.md` and `requirement-verification-questions.md`).
3. Present the "Welcome back" prompt from `common/session-continuity.md` offering to continue or review a prior stage.

Note: the Workspace Root recorded in `aidlc-state.md` is a stale WSL path from another machine. The actual workspace root is this repository root.

### Non-negotiable workflow rules

- **Audit trail**: Log every user input verbatim (never summarized) with ISO 8601 timestamps in `aidlc-docs/audit.md`. Always append via Edit — never rewrite the whole file.
- **Stage gates**: Every stage ends with an explicit approval prompt; do not proceed without user confirmation. CONSTRUCTION stages use the standardized 2-option completion message ("Request Changes" / "Continue to Next Stage") — no emergent 3-option menus.
- **Questions go in files, not chat**: Clarifying questions are written to `.md` files as multiple-choice (A/B/C…) with `[Answer]:` tags per `common/question-format-guide.md`. The user answers in the file.
- **Checkbox tracking**: When a plan step completes, mark it `[x]` in the plan file and update `aidlc-docs/aidlc-state.md` in the same interaction.
- **Code location**: Application code goes in the workspace root (greenfield single-unit pattern: `src/`, `tests/`, `config/`). `aidlc-docs/` holds documentation artifacts only — never code.
- **Extensions** (per `aidlc-state.md`): Security Baseline is OFF — do not load or enforce it. Property-Based Testing is ON with partial scope: pure functions and serialization only.
- **Content validation**: Validate Mermaid/ASCII diagram syntax per `common/content-validation.md` before writing any file containing them.

## Decisions Already Locked In

`aidlc-docs/inception/requirements/requirements.md` is the approved requirements document. Do not relitigate these without the user reopening them:

- **Stack**: Browser-only HTML5 game, TypeScript in strict mode, lightweight game library (Phaser or PixiJS).
- **Architecture**: Modular separation of rendering (grid-based raycaster, DDA), game logic, input, and audio. 60fps target.
- **Maps**: JSON/YAML files loaded at runtime, never compiled into code. Format covers walls, floors, doors, push-wall secrets, spawns, pickups.
- **First deliverable**: Playable prototype — 1 level, 1 weapon (wooden spoon), 1 enemy type (Red Tape), doors + at least 1 push-wall secret, basic HUD (health/weapon/connections), health pickup, basic SFX. Bosses, additional weapons/enemies/levels, save system, and level editor are explicitly out of prototype scope.
- **Testing**: Property-based tests for pure functions and serialization (map loading, math utilities).

## Hard Content Rule (applies to everything generated)

Satire targets systems and archetypes only. No real person (living or dead) and no real political party may be identifiable by name, likeness, slogan, or unmistakable detail. This applies to code identifiers, strings, asset names, level content, and docs. Combat is nonlethal slapstick — stun and disperse, no gore, no killing.

## Build / Test Commands

None exist yet — there is no `package.json` or toolchain until the CONSTRUCTION phase's Code Generation stage scaffolds the project. The Build and Test stage will generate instructions under `aidlc-docs/construction/build-and-test/`. **Update this section with real commands once the project is scaffolded.**
