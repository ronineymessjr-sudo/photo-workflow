# Director v0.28.0 overlay

This directory carries the tested Director-side half of PhotoAtelier's dynamic storyboard integration. It is an overlay for `director-master-aesthetic-agent-v0.28.0`, not a standalone service.

## What changes

- Expands `ShootPlanRequest.output_count` and shot indexes to support up to 16 shots.
- Adds eight distinct, executable shot contracts to the existing eight contracts.
- Keeps requests of eight shots or fewer on the original eight-shot pool for backward compatibility.
- Supplies explicit shot-size and camera-angle fallbacks for legacy contracts.
- Adds a regression test proving that a 16-shot plan contains 16 distinct shot languages with executable framing data.

The PhotoAtelier bridge chooses a target between 9 and 16 from duration, people, scene changes, and delivery complexity. Director returns real contracts only; the bridge never duplicates a shot to reach the target.

## Apply to Director v0.28.0

Stop the Director service, then copy this directory over the Director root while preserving paths:

```text
director-overlay-v0.28.0/director_agent/photoatelier_shoot_planner.py
  -> director_agent/photoatelier_shoot_planner.py
director-overlay-v0.28.0/director_agent/schemas.py
  -> director_agent/schemas.py
director-overlay-v0.28.0/tests/test_photoatelier_shoot_planner.py
  -> tests/test_photoatelier_shoot_planner.py
```

Run from the Director root:

```powershell
.\.venv\Scripts\python.exe -m pytest tests\test_photoatelier_shoot_planner.py tests\test_photoatelier_generation_condition_api.py tests\test_photoatelier_external_generation_api.py -q -p no:cacheprovider
```

Expected result for this overlay: `24 passed`.

## Verified file hashes

```text
3190B1DD6A29189FCBE022D8E44AA16AC35D35BCB572E96FDC52FBA39CEF109D  director_agent/photoatelier_shoot_planner.py
890FEC5D27622C4AA1F3E64C18BB27DEA0B379DD201BC4457F19D8D6F5B35EBD  director_agent/schemas.py
02FA33A91E7EA49047E9759FCFE7FECC8F44AA820AFF9059A21E67C5E91A8905  tests/test_photoatelier_shoot_planner.py
```
