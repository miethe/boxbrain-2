import { SlideThumb } from "@/components/ui";
import { API_BASE_URL } from "@/lib/api";

export function ContentPreview({
  title,
  previewUri,
  fallbackVariant = "dark",
  big = false
}: {
  title: string;
  previewUri?: string | null;
  fallbackVariant?: "dark" | "light" | "teal" | "purple";
  big?: boolean;
}) {
  if (!previewUri) return <SlideThumb title={title} variant={fallbackVariant} brand="BB" big={big} />;
  return (
    <div className="slide-thumb light bg-cover bg-center" role="img" aria-label={`${title} preview`} style={{ backgroundImage: `url("${assetUrl(previewUri)}")` }}>
      <div className="slide-content bg-white/75">
        <div className="slide-brand">BB</div>
        <div className="slide-title">{title}</div>
      </div>
    </div>
  );
}

export function assetUrl(uri: string) {
  if (/^https?:\/\//.test(uri)) return uri;
  return `${API_BASE_URL}${uri.startsWith("/") ? "" : "/"}${uri}`;
}
