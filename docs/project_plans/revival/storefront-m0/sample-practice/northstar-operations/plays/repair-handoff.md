---
{
  "schema_version": 1,
  "type": "play",
  "id": "bb:northstar:play:001",
  "slug": "repair-handoff",
  "title": "Repair a broken handoff",
  "summary": "A conversation path for nobody owns the handoff.",
  "audience": "seller-only",
  "status": "approved",
  "owner": "Practice editor",
  "reviewed_on": "2026-11-10",
  "reviewed_by": "Sample curator",
  "tags": [],
  "practice_id": "bb:northstar:practice:001",
  "trigger": "Nobody owns the handoff.",
  "offering_ids": [
    "bb:northstar:offering:001",
    "bb:northstar:offering:003"
  ],
  "stages": [
    {
      "key": "discover",
      "title": "Discover",
      "action": "Ask where work waits.",
      "exit_criterion": "Sponsor names one handoff to explore.",
      "collateral_ids": [
        "bb:northstar:collateral:001"
      ]
    },
    {
      "key": "shape",
      "title": "Shape",
      "action": "Walk the request across teams using the guide.",
      "exit_criterion": "Teams agree the boundary and a workshop owner.",
      "collateral_ids": [
        "bb:northstar:collateral:006"
      ]
    },
    {
      "key": "agree",
      "title": "Agree",
      "action": "Use the example to discuss scope and invite a mapping session.",
      "exit_criterion": "Sponsor accepts a bounded next conversation.",
      "collateral_ids": [
        "bb:northstar:collateral:002"
      ]
    }
  ]
}
---

## Intent
Help a seller recognize the situation and agree a useful next conversation.

## Boundaries
This is fictional sales guidance. Stage completion is an authored exit criterion, not tracked deal state. Do not promise delivery capacity, commercial terms or outcomes without practice-owner confirmation.
