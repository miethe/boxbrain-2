from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


ApprovalState = Literal["draft", "review", "approved", "deprecated", "archived"]
FreshnessState = Literal["fresh", "aging", "stale"]
LinkSource = Literal["manual", "ai", "hybrid"]
Role = Literal["viewer", "contributor", "curator", "reviewer", "admin"]


class ErrorEnvelope(BaseModel):
    error: dict[str, Any]


class HealthResponse(BaseModel):
    status: str
    service: str = "boxbrain-api"


class Taxonomy(BaseModel):
    offerings: list[str] = Field(default_factory=list)
    technologies: list[str] = Field(default_factory=list)
    sectors: list[str] = Field(default_factory=list)
    geos: list[str] = Field(default_factory=list)
    stages: list[str] = Field(default_factory=list)
    audiences: list[str] = Field(default_factory=list)
    purposes: list[str] = Field(default_factory=list)
    useCases: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    locales: list[str] = Field(default_factory=list)
    visualStyles: list[str] = Field(default_factory=list)


class StatusChips(BaseModel):
    approvalState: ApprovalState
    freshnessState: FreshnessState
    isCanonical: bool = False
    isRestricted: bool = False
    linkSource: LinkSource = "manual"


class PageEnvelope(BaseModel):
    items: list[Any]
    nextCursor: str | None = None


class ProvenanceRecord(BaseModel):
    id: UUID
    originType: str
    sourceSystem: str | None = None
    parentRefs: list[dict[str, Any]] = Field(default_factory=list)
    sourceRefs: list[str] = Field(default_factory=list)
    modelInfo: str | None = None
    pipelineVersion: str | None = None
    createdAt: datetime


class IngestionJob(BaseModel):
    id: UUID
    status: Literal["queued", "running", "failed", "complete"]
    stage: str
    artifactType: str
    title: str | None = None
    originalObjectId: UUID | None = None
    workProductVersionId: UUID | None = None
    uploadMetadata: dict[str, Any] = Field(default_factory=dict)
    errorCode: str | None = None
    errorMessage: str | None = None
    retryCount: int = 0
    createdAt: datetime
    updatedAt: datetime
    completedAt: datetime | None = None


class UploadMetadataRequest(BaseModel):
    artifactType: str = "deck"
    title: str | None = None
    filename: str | None = None
    contentType: str | None = None
    byteSize: int | None = None
    checksum: str | None = None
    taxonomy: Taxonomy = Field(default_factory=Taxonomy)


class ContentUnitVersion(BaseModel):
    id: UUID
    variantId: UUID
    versionNumber: str
    renderUri: str | None = None
    thumbnailUri: str | None = None
    summary: str | None = None
    approvalState: ApprovalState
    freshnessState: FreshnessState
    qualityScore: float | None = None
    usageScore: float | None = None
    createdAt: datetime


class ContentUnitVariant(BaseModel):
    id: UUID
    familyId: UUID
    variantLabel: str
    variantType: str
    variantDimensions: dict[str, Any] = Field(default_factory=dict)
    isCanonical: bool
    linkedBy: LinkSource
    linkedConfidence: float | None = None
    latestVersionId: UUID | None = None
    latestVersion: ContentUnitVersion | None = None


class ContentUnitFamilyCard(BaseModel):
    id: UUID
    familyTitle: str
    conceptualSummary: str | None = None
    unitType: str
    canonicalPreviewUri: str | None = None
    variantCount: int
    versionCount: int
    taxonomy: Taxonomy
    statusChips: StatusChips


class ContentUnitFamilyDetail(ContentUnitFamilyCard):
    variants: list[ContentUnitVariant] = Field(default_factory=list)
    notes: list["Note"] = Field(default_factory=list)


class ContentUnitVersionDetail(ContentUnitVersion):
    extractedText: str | None = None
    speakerNotes: str | None = None
    provenance: ProvenanceRecord
    comments: list["Comment"] = Field(default_factory=list)
    notes: list["Note"] = Field(default_factory=list)


class UpdateApprovalRequest(BaseModel):
    approvalState: ApprovalState
    notes: str | None = None


class WorkProductFamilyCard(BaseModel):
    id: UUID
    title: str
    artifactType: str
    summary: str | None = None
    previewUri: str | None = None
    variantCount: int
    versionCount: int
    statusChips: StatusChips


class WorkProductVersionDetail(BaseModel):
    id: UUID
    title: str
    artifactType: str
    versionNumber: str
    approvalState: ApprovalState
    previewUri: str | None = None
    filmstrip: list[ContentUnitVersion] = Field(default_factory=list)
    provenance: ProvenanceRecord


class SearchRequest(BaseModel):
    query: str
    profile: Literal[
        "general",
        "executive",
        "technical",
        "opportunity",
        "duplicate_review",
        "similarity_review",
        "approved_only",
    ] = "general"
    objectTypes: list[str] = Field(default_factory=list)
    filters: dict[str, Any] = Field(default_factory=dict)
    resultMode: Literal["auto", "families", "variants", "versions"] = "auto"
    limit: int = 20


class AskRequest(SearchRequest):
    context: dict[str, Any] = Field(default_factory=dict)


class SearchResultItem(BaseModel):
    objectType: str
    objectId: UUID
    resultGrain: Literal["family", "variant", "version", "block", "work_product", "play"]
    title: str
    summary: str | None = None
    previewUri: str | None = None
    score: float
    explanationChips: list[str] = Field(default_factory=list)
    statusChips: StatusChips


class SearchResponse(BaseModel):
    query: str
    interpretedIntent: str | None = None
    items: list[SearchResultItem] = Field(default_factory=list)
    debug: dict[str, Any] | None = None


class CreateContentBlockMember(BaseModel):
    memberType: Literal["content_unit_variant", "content_unit_version"]
    memberId: UUID
    orderIndex: int
    role: str | None = None
    isRequired: bool = True
    notes: str | None = None


class CreateContentBlockRequest(BaseModel):
    title: str
    summary: str | None = None
    blockType: str = "sequence"
    members: list[CreateContentBlockMember]


class ContentBlockMember(BaseModel):
    id: UUID
    memberType: str
    memberId: UUID
    orderIndex: int
    role: str | None = None
    isRequired: bool = True
    notes: str | None = None


class ContentBlockVersionDetail(BaseModel):
    id: UUID
    familyId: UUID
    title: str
    summary: str | None = None
    blockType: str
    approvalState: ApprovalState
    members: list[ContentBlockMember] = Field(default_factory=list)
    createdAt: datetime


class CreateStoryboardRequest(BaseModel):
    title: str
    mode: Literal["work_product", "play", "opportunity"] = "work_product"
    parentType: str | None = None
    parentId: UUID | None = None


class Storyboard(BaseModel):
    id: UUID
    mode: str
    title: str
    currentSnapshotId: UUID | None = None
    createdAt: datetime
    updatedAt: datetime


class StoryboardSlot(BaseModel):
    id: UUID
    sectionId: UUID
    slotType: Literal["content_unit", "content_block", "work_product_ref", "gap"]
    selectedObjectType: str | None = None
    selectedObjectId: UUID | None = None
    orderIndex: int
    purpose: str | None = None
    isRequired: bool
    aiRecommended: bool = False


class StoryboardSection(BaseModel):
    id: UUID
    snapshotId: UUID | None = None
    storyboardId: UUID
    title: str
    summary: str | None = None
    orderIndex: int
    slots: list[StoryboardSlot] = Field(default_factory=list)


class StoryboardSnapshot(BaseModel):
    id: UUID
    storyboardId: UUID
    versionLabel: str | None = None
    approvalState: ApprovalState
    narrativeScore: float | None = None
    sections: list[StoryboardSection] = Field(default_factory=list)
    createdAt: datetime


class StoryboardDetail(Storyboard):
    draftSections: list[StoryboardSection] = Field(default_factory=list)
    currentSnapshot: StoryboardSnapshot | None = None


class CreateStoryboardSectionRequest(BaseModel):
    title: str
    summary: str | None = None
    orderIndex: int | None = None


class CreateStoryboardSlotRequest(BaseModel):
    slotType: Literal["content_unit", "content_block", "work_product_ref", "gap"]
    selectedObjectType: str | None = None
    selectedObjectId: UUID | None = None
    orderIndex: int | None = None
    purpose: str | None = None
    isRequired: bool = True


class UpdateStoryboardSlotRequest(BaseModel):
    slotType: Literal["content_unit", "content_block", "work_product_ref", "gap"] | None = None
    selectedObjectType: str | None = None
    selectedObjectId: UUID | None = None
    orderIndex: int | None = None
    purpose: str | None = None
    isRequired: bool | None = None


class CreateStoryboardSnapshotRequest(BaseModel):
    versionLabel: str | None = None


class StoryboardDiagnosticWarning(BaseModel):
    code: str
    severity: Literal["info", "warning", "critical"]
    message: str
    targetType: str
    targetId: UUID | None = None


class StoryboardDiagnostics(BaseModel):
    narrativeScore: float | None = None
    warnings: list[StoryboardDiagnosticWarning] = Field(default_factory=list)


class CreateCommentRequest(BaseModel):
    kind: Literal["review_comment", "persistent_comment", "note_discussion"]
    targetType: str
    targetId: UUID
    anchor: dict[str, Any] = Field(default_factory=dict)
    parentCommentId: UUID | None = None
    body: str


class Comment(BaseModel):
    id: UUID
    kind: str
    targetType: str
    targetId: UUID
    anchor: dict[str, Any] = Field(default_factory=dict)
    parentCommentId: UUID | None = None
    body: str
    status: str
    createdAt: datetime


class CreateNoteRequest(BaseModel):
    targetType: str
    targetId: UUID
    title: str | None = None
    body: str
    noteType: str = "usage_guidance"
    isPinned: bool = False


class Note(BaseModel):
    id: UUID
    targetType: str
    targetId: UUID
    title: str | None = None
    body: str
    noteType: str
    isPinned: bool
    createdAt: datetime
    updatedAt: datetime


class ReviewItem(BaseModel):
    id: UUID
    queueType: str
    status: Literal["open", "accepted", "rejected", "snoozed", "resolved"]
    confidence: float | None = None
    rationale: str | None = None
    suggestedAction: str | None = None
    targetRefs: list[dict[str, Any]] = Field(default_factory=list)
    source: str = "ai"
    createdAt: datetime


class ReviewItemDetail(ReviewItem):
    compareObjects: list[dict[str, Any]] = Field(default_factory=list)
    auditPreview: dict[str, Any] = Field(default_factory=dict)


class ReviewActionRequest(BaseModel):
    reason: str | None = None
    targetVariantId: UUID | None = None
    targetVersionId: UUID | None = None


class ReviewQueueSummary(BaseModel):
    queueType: str
    openCount: int
    oldestCreatedAt: datetime | None = None


class AuditEvent(BaseModel):
    id: UUID
    action: str
    actorId: str
    targetType: str
    targetId: UUID
    priorState: dict[str, Any]
    newState: dict[str, Any]
    reason: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    createdAt: datetime


class AdminHealth(BaseModel):
    status: str
    contentUnitFamilies: int
    contentUnitVersions: int
    workProductVersions: int
    contentBlocks: int
    storyboards: int
    ingestionJobs: int
    auditEvents: int
