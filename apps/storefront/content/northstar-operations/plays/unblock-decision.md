---
{
  "schema_version": 1,
  "type": "play",
  "id": "bb:northstar:play:002",
  "slug": "unblock-decision",
  "title": "Unblock a decision",
  "summary": "A conversation path for we keep waiting for approval.",
  "audience": "seller-only",
  "status": "approved",
  "owner": "Practice editor",
  "reviewed_on": "2026-11-10",
  "reviewed_by": "Sample curator",
  "tags": [],
  "practice_id": "bb:northstar:practice:001",
  "trigger": "We keep waiting for approval.",
  "offering_ids": [
    "bb:northstar:offering:002"
  ],
  "stages": [
    {
      "key": "discover",
      "title": "Discover",
      "action": "Follow one delayed approval with the question sheet.",
      "exit_criterion": "Decision owner and required controls are named.",
      "collateral_ids": [
        "bb:northstar:collateral:004"
      ]
    },
    {
      "key": "shape",
      "title": "Shape",
      "action": "Discuss a small change to inputs or decision ownership.",
      "exit_criterion": "A safe experiment and review date are agreed.",
      "collateral_ids": [
        "bb:northstar:collateral:004"
      ]
    },
    {
      "key": "agree",
      "title": "Agree",
      "action": "Invite the owner to a scoped Decision Flow session.",
      "exit_criterion": "Owner agrees the session purpose.",
      "collateral_ids": []
    }
  ]
}
---

## Intent
Help a seller recognize the situation and agree a useful next conversation.

## Boundaries
This is fictional sales guidance. Stage completion is an authored exit criterion, not tracked deal state. Do not promise delivery capacity, commercial terms or outcomes without practice-owner confirmation.
