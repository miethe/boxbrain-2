# BoxBrain Worker

Worker-owned scaffold for ingestion stages. The MVP API currently stores upload metadata and ingestion jobs in memory; this package defines the stage names and an idempotent runner shape for the future Redis-backed worker.

