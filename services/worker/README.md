# BoxBrain Worker

Worker-owned scaffold for ingestion stages.

Run the local RQ ingestion worker after starting infra and the API in database/S3/RQ mode:

```bash
make worker-ingest
```

The worker listens on the `boxbrain-ingestion` queue and executes the deterministic MVP PPTX ingestion entrypoint.

For the full containerized stack, use:

```bash
make app-up
make app-logs
```

The Compose stack runs the worker from the shared API image and points it at Redis on the internal Compose network.
