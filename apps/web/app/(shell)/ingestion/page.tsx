import { IngestionWorkspace } from "@/components/ingestion-workspace";
import { PageHeader } from "@/components/ui";

export default function IngestionPage() {
  return (
    <div className="route-body">
      <PageHeader
        eyebrow="Ingestion"
        title="Upload and job monitor"
        description="API-backed source upload, queue status, and job detail for governed artifact ingestion."
      />
      <IngestionWorkspace />
    </div>
  );
}
