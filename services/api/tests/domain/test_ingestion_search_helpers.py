from __future__ import annotations

import io
import unittest
import zipfile
from dataclasses import replace
from datetime import datetime, timezone

from app.domain.ingestion_search import (
    AIOutputStatus,
    AIOutputType,
    ApprovalState,
    FreshnessState,
    IngestionJobState,
    IngestionStage,
    IngestionStatus,
    SearchDocument,
    SearchQuery,
    WorkerStep,
    content_unit_fingerprint,
    cosine_similarity,
    create_ai_review_candidate,
    deterministic_text_embedding,
    fail_job,
    hash_bytes,
    hash_text,
    mark_stage_complete,
    next_worker_steps,
    rank_documents,
    retry_job,
    stage_progress,
    to_ai_output_record,
    validate_pptx_upload,
)
from services.worker.ingestion_search import build_content_unit_index_record


def _pptx_bytes(slide_count: int = 1, include_core: bool = True) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", "<Types />")
        archive.writestr("ppt/presentation.xml", "<presentation />")
        for index in range(1, slide_count + 1):
            archive.writestr(f"ppt/slides/slide{index}.xml", "<slide />")
        if include_core:
            archive.writestr("docProps/core.xml", "<core />")
    return buffer.getvalue()


class PptxValidationTests(unittest.TestCase):
    def test_validates_pptx_structure_and_hash(self) -> None:
        payload = _pptx_bytes(slide_count=2)

        result = validate_pptx_upload(
            filename="Board Update.PPTX",
            content=payload,
            content_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        )

        self.assertTrue(result.valid)
        self.assertEqual(result.normalized_file_type, "pptx")
        self.assertEqual(result.artifact_type, "deck")
        self.assertEqual(result.slide_count, 2)
        self.assertEqual(result.content_hash, hash_bytes(payload))

    def test_rejects_non_pptx_upload(self) -> None:
        result = validate_pptx_upload(filename="brief.pdf", content=b"%PDF-1.7")

        self.assertFalse(result.valid)
        self.assertEqual(result.error_code, "unsupported_file_type")

    def test_rejects_pptx_without_slides(self) -> None:
        payload = _pptx_bytes(slide_count=0)

        result = validate_pptx_upload(filename="empty.pptx", content=payload)

        self.assertFalse(result.valid)
        self.assertEqual(result.error_code, "pptx_no_slides")


class IngestionStageTests(unittest.TestCase):
    def test_stage_progress_and_worker_steps_are_ordered(self) -> None:
        self.assertEqual(next_worker_steps(IngestionStage.UPLOADED), (WorkerStep.VALIDATE_FILE,))
        self.assertEqual(
            next_worker_steps(IngestionStage.EXTRACTED),
            (WorkerStep.CREATE_UNITS, WorkerStep.EMBED_UNITS),
        )
        self.assertLess(stage_progress(IngestionStage.VALIDATED), stage_progress(IngestionStage.COMPLETE))

    def test_marks_stage_complete_and_retries_failure_without_advancing(self) -> None:
        job = IngestionJobState(id="job-1")

        validated = mark_stage_complete(job, IngestionStage.VALIDATED)
        failed = fail_job(
            validated,
            failed_stage=IngestionStage.RENDERED,
            error_code="render_failed",
            error_message="renderer exited",
        )
        retried = retry_job(failed)

        self.assertEqual(validated.status, IngestionStatus.RUNNING)
        self.assertEqual(validated.stage, IngestionStage.VALIDATED)
        self.assertEqual(failed.status, IngestionStatus.FAILED)
        self.assertEqual(failed.stage, IngestionStage.RENDERED)
        self.assertEqual(retried.status, IngestionStatus.QUEUED)
        self.assertEqual(retried.stage, IngestionStage.RENDERED)
        self.assertIsNone(retried.error_code)

    def test_rejects_skipped_stage(self) -> None:
        with self.assertRaises(ValueError):
            mark_stage_complete(IngestionJobState(id="job-1"), IngestionStage.RENDERED)


class HashingAndEmbeddingTests(unittest.TestCase):
    def test_text_hash_normalizes_case_and_whitespace(self) -> None:
        self.assertEqual(hash_text(" Operating\nMargin "), hash_text("operating margin"))

    def test_content_unit_fingerprint_preserves_atomic_source_order(self) -> None:
        first = content_unit_fingerprint(
            source_file_hash="source",
            source_order_index=0,
            extracted_text="same slide text",
        )
        second = content_unit_fingerprint(
            source_file_hash="source",
            source_order_index=1,
            extracted_text="same slide text",
        )

        self.assertEqual(first.text_hash, second.text_hash)
        self.assertNotEqual(first.content_hash, second.content_hash)

    def test_deterministic_embedding_is_stable_and_token_sensitive(self) -> None:
        left = deterministic_text_embedding("operating margin board", dims=32)
        same_topic = deterministic_text_embedding("board operating margin", dims=32)
        other_topic = deterministic_text_embedding("customer support tickets", dims=32)

        self.assertEqual(left, deterministic_text_embedding("operating margin board", dims=32))
        self.assertGreater(cosine_similarity(left, same_topic), cosine_similarity(left, other_topic))


class RankingTests(unittest.TestCase):
    def test_ranks_with_lexical_semantic_metadata_trust_and_freshness(self) -> None:
        now = datetime(2026, 5, 1, tzinfo=timezone.utc)
        matching = SearchDocument(
            id="matching",
            object_type="content_unit_version",
            title="Operating margin board update",
            summary="Margin expansion for board audience.",
            text="Operating margin improved in Q2.",
            taxonomy={"audiences": ["board"], "purposes": ["update"]},
            approval_state=ApprovalState.APPROVED,
            freshness_state=FreshnessState.FRESH,
            updated_at=now,
        )
        stale = SearchDocument(
            id="stale",
            object_type="content_unit_version",
            title="Operating margin draft",
            text="Operating margin old analysis.",
            taxonomy={"audiences": ["sales"]},
            approval_state=ApprovalState.DRAFT,
            freshness_state=FreshnessState.STALE,
            updated_at=datetime(2024, 5, 1, tzinfo=timezone.utc),
        )

        results = rank_documents(
            SearchQuery(text="operating margin board", taxonomy={"audiences": ["board"]}),
            [stale, matching],
            now=now,
        )

        self.assertEqual([result.document.id for result in results], ["matching", "stale"])
        self.assertGreater(results[0].breakdown.metadata, results[1].breakdown.metadata)
        self.assertGreater(results[0].breakdown.trust, results[1].breakdown.trust)
        self.assertGreater(results[0].breakdown.freshness, results[1].breakdown.freshness)

    def test_restricted_documents_do_not_leak_without_permission(self) -> None:
        public = SearchDocument(id="public", object_type="content_unit_version", text="margin")
        restricted = SearchDocument(
            id="restricted",
            object_type="content_unit_version",
            text="margin secret",
            is_restricted=True,
            restricted_to_principal_ids=frozenset({"group-a"}),
        )

        hidden = rank_documents(SearchQuery(text="margin"), [restricted, public])
        visible = rank_documents(
            SearchQuery(text="margin", principal_ids=frozenset({"group-a"})),
            [restricted, public],
        )

        self.assertEqual([result.document.id for result in hidden], ["public"])
        self.assertIn("restricted", [result.document.id for result in visible])


class AiCandidateTests(unittest.TestCase):
    def test_ai_outputs_are_serialized_as_suggested_review_candidates(self) -> None:
        candidate = create_ai_review_candidate(
            target_type="content_unit_version",
            target_id="unit-1",
            output_type=AIOutputType.DUPLICATE_CANDIDATE,
            proposed_output={"duplicate_of": "unit-2"},
            pipeline_version="pipeline-v1",
            model_info="deterministic-test",
            prompt_ref="prompts/duplicates/v1",
            confidence=0.91,
            rationale="matching hash and semantic score",
        )
        record = to_ai_output_record(candidate)

        self.assertEqual(candidate.status, AIOutputStatus.SUGGESTED)
        self.assertTrue(candidate.review_required)
        self.assertEqual(record["status"], "suggested")
        self.assertTrue(record["output"]["review_required"])

    def test_ai_output_serializer_rejects_non_suggested_status(self) -> None:
        candidate = create_ai_review_candidate(
            target_type="content_unit_version",
            target_id="unit-1",
            output_type=AIOutputType.TAXONOMY,
            proposed_output={"tags": ["margin"]},
            pipeline_version="pipeline-v1",
            model_info="deterministic-test",
            prompt_ref="prompts/taxonomy/v1",
            confidence=0.75,
            rationale="keyword match",
        )

        with self.assertRaises(ValueError):
            to_ai_output_record(replace(candidate, status=AIOutputStatus.ACCEPTED))


class WorkerFacadeTests(unittest.TestCase):
    def test_builds_index_record_with_fingerprint_and_embedding(self) -> None:
        record = build_content_unit_index_record(
            source_file_hash="source",
            source_order_index=3,
            extracted_text="Operating margin improved.",
            speaker_notes="Board talk track.",
            metadata={"audiences": ["board"]},
            embedding_dims=16,
        )

        self.assertEqual(record.source_order_index, 3)
        self.assertEqual(len(record.embedding), 16)
        self.assertEqual(record.fingerprint.source_order_index, 3)
        self.assertIsNotNone(record.fingerprint.content_hash)


if __name__ == "__main__":
    unittest.main()
