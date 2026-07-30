# Homepage Build Harness

This repository uses a lightweight harness to keep homepage design, feature scope, Codex tasks, and GitHub review aligned.

## Operating Loop

1. Define or update the product intent in `docs/product-brief.md`.
2. Add design constraints to `docs/design-system.md`.
3. Track requested work in `docs/feature-backlog.md`.
4. Ask Codex to implement one feature or design change at a time.
5. Review the pull request with `.github/PULL_REQUEST_TEMPLATE.md`.
6. Update `docs/decision-log.md` when a meaningful product or design decision is made.

## Codex Task Format

Use this format when asking Codex to make changes:

```md
Goal:
Build or change ...

Context:
- Product brief: docs/product-brief.md
- Design system: docs/design-system.md
- Related backlog item: ...

Requirements:
- ...
- ...

Acceptance Criteria:
- ...
- ...

Constraints:
- Keep the existing visual direction unless the task says otherwise.
- Do not introduce unrelated refactors.
- Run available checks before finishing.
```

## GitHub Workflow

Recommended branch naming:

- `feature/<short-name>`
- `design/<short-name>`
- `fix/<short-name>`
- `content/<short-name>`

Recommended PR title format:

- `Feature: add pricing section`
- `Design: refine mobile navigation`
- `Content: update hero copy`
- `Fix: correct CTA link`

## Definition Of Done

A change is done when:

- The implementation matches the linked requirement.
- Desktop and mobile layouts have been considered.
- Copy is final enough for review.
- No unrelated files were changed.
- Available tests, linting, or build checks pass, or failures are documented.
- The PR template is filled out.

