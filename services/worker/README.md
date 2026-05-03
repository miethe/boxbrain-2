# BoxBrain Worker

Worker-owned scaffold for ingestion stages.

Run the local RQ ingestion worker after starting infra and the API in database/S3/RQ mode:

```bash
make worker-ingest
```

The worker listens on the `boxbrain-ingestion` queue and executes the deterministic MVP PPTX ingestion entrypoint.
