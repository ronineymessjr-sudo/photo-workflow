# Shot workflow acceptance - 2026-09-19

## Scope

- Dynamic 9-16 shot plans without duplicated filler shots.
- Overview table before per-shot execution details.
- One selected shot drives one candidate image and its adjacent instructions.
- Plan generation no longer exposes the on-set checklist or shooting-day mode.
- A saved plan must be adopted for a date before the schedule exposes on-set mode.
- One consolidated reference-search entry.
- Clear Word export with overview and all per-shot instructions.

## Automated results

- Director targeted tests: 24 passed.
- Integration and bridge tests: 8 passed.
- Real bridge requests:
  - 1 hour, single scene: desired 9, actual 9, unique 9.
  - 2 hours, single scene: desired 11, actual 11, unique 11.
  - 5 hours, two people, multiple scenes and multi-platform delivery: desired 16, actual 16, unique 16.
- Desktop browser:
  - 11 overview rows, 11 detail sections, 11 candidate choices.
  - Candidate instructions changed when switching from shot 1 to shot 2.
  - Exactly one consolidated reference search.
  - No “拍摄当天” or “拍摄清单” in generated-plan output.
  - Adopted plan created a dated schedule; on-set mode opened with the same 11 shots.
  - Word export created a `.doc` with the 11-shot overview, all details, and shot 11.
  - No page or console errors.
- Mobile browser at 390 x 844:
  - 9 overview rows and 9 candidate choices for a one-hour plan.
  - document width 390, scroll width 390; no horizontal overflow.
  - No page or console errors.

## Evidence files

Generated locally in the user's Downloads folder:

- `photoatelier-plan-acceptance-1440.png`
- `photoatelier-plan-library-acceptance-1440.png`
- `photoatelier-onset-acceptance-1440.png`
- `photoatelier-plan-acceptance-390.png`

The tests did not call the paid image-generation action. Candidate selection and exact-shot contract wiring were verified without consuming provider credits.
