# Item entry accessibility

These acceptance criteria apply to the creation and editing drawer.

- Identify the title as required. Explain that a rating is optional and accepts
  numbers from 0 to 5, including decimals. Distinguish incomplete numeric input
  from an omitted rating.
- Associate actionable field errors with their controls and mark invalid fields.
  On invalid submission, focus the first invalid control.
- Keep a live alert inside the drawer for validation and save failures.
- Update feedback as fields are corrected. Clear old feedback when cancelling
  or opening another draft.
- Require titled seasons containing at least one titled episode when series
  tracking is configured. A series without seasons remains valid. Identify the
  season title, episode title, or add-episode control that needs attention.
- Preserve the draft after validation or storage failures so users can correct
  it or retry. Rejected input must leave the persisted archive unchanged.
- Support keyboard submission and keep feedback within the drawer at mobile widths.

## Verification

[Form validation browser tests](../e2e/item-validation.spec.ts) cover control
associations, focus, live-alert content, feedback clearing, keyboard submission,
mobile overflow, draft preservation, persistence, and retry after a failed write.
[Core validation tests](../tests/item-form-validation.test.ts) cover field rules.

Persistence assertions use a fresh app page and the public backup export through
[shared archive helpers](../e2e/helpers/archive.ts); they do not depend on database
names, object stores, or record keys. The helper isolates the adapter-specific
fault injection used to exercise storage failure.

Automated DOM checks do not replace manual screen-reader testing.
