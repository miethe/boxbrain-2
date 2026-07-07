import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AlertCircle, GitBranchPlus, Layers, PackagePlus, Plus, Replace } from "lucide-react";
import {
  ApiError,
  API_BASE_URL,
  boxbrainApi,
  type ContentBlockMember,
  type ContentBlockVersionDetail,
  type ContentUnitVersionDetail,
  type Storyboard,
  type StoryboardDetail
} from "@/lib/api";
import { Button, Card, EmptyState, PageHeader, SlideThumb, StatusBadge, Tag } from "@/components/ui";

type MemberModel = {
  member: ContentBlockMember;
  version?: ContentUnitVersionDetail;
  error?: string;
};

type ContentBlockLoadResult =
  | {
      status: "ok";
      block: ContentBlockVersionDetail;
      members: MemberModel[];
      storyboards: StoryboardDetail[];
    }
  | {
      status: "restricted";
    }
  | {
      status: "not_found";
      storyboards: Storyboard[];
    }
  | {
      status: "error";
      message: string;
    };

export default async function ContentBlockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await loadContentBlock(id);

  if (result.status === "restricted") return <RestrictedContentBlock />;
  if (result.status === "not_found") return <ContentBlockNotFound id={id} storyboards={result.storyboards} />;
  if (result.status === "error") return <ContentBlockError message={result.message} />;

  return (
    <div className="route-body" data-testid="content-block-page">
      <PageHeader
        eyebrow="ContentBlock"
        title={result.block.title}
        description={result.block.summary ?? "An ordered reusable mini-story composed from governed ContentUnits."}
        actions={
          <StatusBadge tone={approvalTone(result.block.approvalState)}>
            {result.block.approvalState}
          </StatusBadge>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_360px]">
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold">
            <Layers size={16} /> Ordered members
          </div>
          {result.members.length === 0 ? (
            <EmptyState title="No members returned" body="The ContentBlock exists, but the API did not return any ordered members for it." />
          ) : (
            <div className="grid gap-3">
              {result.members.map((item) => (
                <MemberCard key={item.member.id} item={item} />
              ))}
            </div>
          )}
        </Card>

        <div className="grid content-start gap-4">
          <Card className="p-4">
            <h2 className="m-0 text-sm font-bold">Governance</h2>
            <div className="mt-3 grid gap-2">
              <StatusBadge tone="ok">ordered composition preserved</StatusBadge>
              <StatusBadge tone="ok">source units retain provenance</StatusBadge>
              <StatusBadge tone={approvalTone(result.block.approvalState)}>{result.block.approvalState}</StatusBadge>
              <Tag>{result.block.blockType}</Tag>
              <Tag>{result.block.members.length} members</Tag>
            </div>
          </Card>

          <InsertIntoStoryboardForm block={result.block} storyboards={result.storyboards} />
          <CreateContentBlockForm />
        </div>
      </div>
    </div>
  );
}

async function loadContentBlock(id: string): Promise<ContentBlockLoadResult> {
  try {
    const block = await boxbrainApi.getContentBlock(id);
    const [members, storyboards] = await Promise.all([loadMembers(block), loadStoryboardDetails()]);
    return { status: "ok", block, members, storyboards };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return { status: "restricted" };
    }
    if (error instanceof ApiError && error.status === 404) {
      return { status: "not_found", storyboards: await safeListStoryboards() };
    }
    return { status: "error", message: error instanceof Error ? error.message : "The ContentBlock API request failed." };
  }
}

async function loadMembers(block: ContentBlockVersionDetail): Promise<MemberModel[]> {
  return Promise.all(
    [...block.members]
      .sort((left, right) => left.orderIndex - right.orderIndex)
      .map(async (member) => {
        if (member.memberType !== "content_unit_version") return { member };
        try {
          return { member, version: await boxbrainApi.getContentUnitVersion(member.memberId) };
        } catch (error) {
          return { member, error: error instanceof Error ? error.message : "Member detail unavailable." };
        }
      })
  );
}

async function safeListStoryboards(): Promise<Storyboard[]> {
  try {
    return await boxbrainApi.listAllStoryboards();
  } catch {
    return [];
  }
}

async function loadStoryboardDetails(): Promise<StoryboardDetail[]> {
  const storyboards = await safeListStoryboards();
  const details = await Promise.all(
    storyboards.map(async (storyboard) => {
      try {
        return await boxbrainApi.getStoryboard(storyboard.id);
      } catch {
        return null;
      }
    })
  );
  return details.filter((storyboard): storyboard is StoryboardDetail => Boolean(storyboard));
}

async function createContentBlockAction(formData: FormData) {
  "use server";

  const title = requiredFormValue(formData, "title");
  const memberIds = parseLines(requiredFormValue(formData, "memberIds"));
  const block = await boxbrainApi.createContentBlock({
    title,
    summary: optionalFormValue(formData, "summary"),
    members: memberIds.map((memberId, index) => ({
      memberType: "content_unit_version",
      memberId,
      orderIndex: index,
      role: index === 0 ? "setup" : "support"
    }))
  });
  revalidatePath("/library");
  redirect(`/content-blocks/${block.id}`);
}

async function insertContentBlockAction(formData: FormData) {
  "use server";

  const blockId = requiredFormValue(formData, "blockId");
  const [storyboardId, sectionId] = requiredFormValue(formData, "target").split("|");
  if (!storyboardId || !sectionId) throw new Error("target is required.");
  await boxbrainApi.createStoryboardSlot(sectionId, {
    slotType: "content_block",
    selectedObjectType: "content_block_version",
    selectedObjectId: blockId,
    purpose: optionalFormValue(formData, "purpose") ?? "Reusable ContentBlock",
    isRequired: true
  });
  revalidatePath(`/content-blocks/${blockId}`);
  revalidatePath(`/storyboards/${storyboardId}`);
}

function MemberCard({ item }: { item: MemberModel }) {
  const title = item.version?.summary?.trim() || item.member.role || "ContentUnit version";
  const previewUri = item.version?.thumbnailUri ?? item.version?.renderUri;

  return (
    <Link
      href={item.member.memberType === "content_unit_version" ? `/content-units/${item.member.memberId}` : "#"}
      className="grid grid-cols-[36px_150px_minmax(0,1fr)] items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
    >
      <div className="grid h-8 w-8 place-items-center rounded-full bg-blue-50 text-sm font-black text-blue-700">{item.member.orderIndex + 1}</div>
      {previewUri ? <RenderedPreview uri={previewUri} title={title} /> : <SlideThumb title={title} variant="light" />}
      <div className="min-w-0">
        <div className="truncate text-sm font-bold">{title}</div>
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
          <Tag>{item.member.memberType}</Tag>
          {item.member.role && <Tag>{item.member.role}</Tag>}
          {!item.member.isRequired && <Tag tone="warn">optional</Tag>}
        </div>
        {item.member.notes && <p className="m-0 mt-1 text-xs text-slate-500">{item.member.notes}</p>}
        {item.error && <p className="m-0 mt-1 text-xs text-amber-700">{item.error}</p>}
      </div>
    </Link>
  );
}

function InsertIntoStoryboardForm({ block, storyboards }: { block: ContentBlockVersionDetail; storyboards: StoryboardDetail[] }) {
  const sectionOptions = storyboards.flatMap((storyboard) =>
    storyboard.draftSections.map((section) => ({
      storyboardId: storyboard.id,
      storyboardTitle: storyboard.title,
      sectionId: section.id,
      sectionTitle: section.title
    }))
  );

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold">
        <PackagePlus size={16} /> Insert into Storyboard
      </div>
      {sectionOptions.length === 0 ? (
        <p className="m-0 text-sm text-slate-500">No editable Storyboard sections are visible. Add a section on a Storyboard before inserting this block.</p>
      ) : (
        <form action={insertContentBlockAction} className="grid gap-3">
          <input type="hidden" name="blockId" value={block.id} />
          <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.06em] text-slate-500">
            Target section
            <select name="target" className="rounded-lg border border-slate-200 bg-white p-2 text-sm font-medium normal-case text-slate-900">
              {sectionOptions.map((option) => (
                <option key={option.sectionId} value={`${option.storyboardId}|${option.sectionId}`}>
                  {option.storyboardTitle} / {option.sectionTitle}
                </option>
              ))}
            </select>
          </label>
          <input name="purpose" className="rounded-lg border border-slate-200 p-2 text-sm" placeholder="Slot purpose" defaultValue="Reusable mini-story" />
          <Button variant="primary" type="submit">
            <Plus size={14} /> Insert block
          </Button>
        </form>
      )}
    </Card>
  );
}

function CreateContentBlockForm() {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold">
        <GitBranchPlus size={16} /> Create ContentBlock
      </div>
      <form action={createContentBlockAction} className="grid gap-3">
        <input name="title" className="rounded-lg border border-slate-200 p-2 text-sm" placeholder="Block title" required />
        <textarea name="summary" className="min-h-20 resize-none rounded-lg border border-slate-200 p-2 text-sm" placeholder="Summary" />
        <textarea
          name="memberIds"
          className="min-h-28 resize-none rounded-lg border border-slate-200 p-2 font-mono text-xs"
          placeholder="One ContentUnit version UUID per line"
          required
        />
        <Button type="submit">
          <Plus size={14} /> Create block
        </Button>
      </form>
    </Card>
  );
}

function ContentBlockNotFound({ id, storyboards }: { id: string; storyboards: Storyboard[] }) {
  return (
    <div className="route-body" data-testid="content-block-not-found">
      <PageHeader eyebrow="ContentBlock" title="ContentBlock not found" description={`No visible ContentBlock was returned for ${id}.`} />
      <div className="two-col">
        <EmptyState title="No detail available" body="The API returned 404 or filtered this block out of the visible catalog." />
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold">
            <Replace size={16} /> Visible Storyboards
          </div>
          <div className="grid gap-2">
            {storyboards.length === 0 ? (
              <p className="m-0 text-sm text-slate-500">No Storyboards are visible to this user.</p>
            ) : (
              storyboards.map((storyboard) => (
                <Link key={storyboard.id} href={`/storyboards/${storyboard.id}`} className="rounded-lg border border-slate-200 p-2 text-sm font-semibold hover:bg-slate-50">
                  {storyboard.title}
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>
      <div className="mt-4 max-w-xl">
        <CreateContentBlockForm />
      </div>
    </div>
  );
}

function ContentBlockError({ message }: { message: string }) {
  return (
    <div className="route-body" data-testid="content-block-error">
      <PageHeader eyebrow="ContentBlock" title="ContentBlock request failed" description="The live ContentBlock API could not be loaded." />
      <Card className="border-red-200 bg-red-50 p-5 text-red-900">
        <div className="flex items-start gap-3">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-bold">API error</div>
            <p className="m-0 mt-1 text-sm">{message}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function RestrictedContentBlock() {
  return (
    <div className="route-body" data-testid="content-block-restricted">
      <PageHeader eyebrow="ContentBlock" title="Restricted ContentBlock" description="The current user cannot access this ordered composition." />
      <Card className="border-amber-200 bg-amber-50 p-5 text-amber-900">
        <div className="flex items-start gap-3">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-bold">Access restricted</div>
            <p className="m-0 mt-1 text-sm">No member titles, previews, or source references are shown for restricted ContentBlocks.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function RenderedPreview({ uri, title }: { uri: string; title: string }) {
  return (
    <div
      className="slide-thumb light bg-cover bg-center"
      aria-label={`${title} preview`}
      style={{
        backgroundImage: `url("${assetUrl(uri)}")`
      }}
    >
      <div className="slide-content bg-white/75">
        <div className="slide-brand">BB</div>
        <div className="slide-title">{title}</div>
      </div>
    </div>
  );
}

function assetUrl(uri: string) {
  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;
  return `${API_BASE_URL}${uri}`;
}

function approvalTone(value: string) {
  if (value === "approved") return "ok";
  if (value === "deprecated" || value === "archived") return "danger";
  if (value === "review") return "warn";
  return "neutral";
}

function parseLines(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function requiredFormValue(formData: FormData, field: string) {
  const value = optionalFormValue(formData, field);
  if (!value) throw new Error(`${field} is required.`);
  return value;
}

function optionalFormValue(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
