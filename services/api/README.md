# BoxBrain API

FastAPI backend scaffold for the BoxBrain v2 MVP.

The current adapter is a seeded in-memory repository so the frontend and worker flows can integrate against stable routes before the PostgreSQL adapter lands.

Run locally:

```bash
uv run uvicorn app.main:app --reload
```

Run tests:

```bash
uv run pytest
```
