import { Boxes, FileQuestion, FileText, GripVertical, Layers } from "lucide-react";
import type { ComponentType } from "react";

type IconProps = { size?: number; className?: string; "aria-hidden"?: boolean; color?: string };

const ICONS: Record<string, ComponentType<IconProps>> = {
  content_unit_version: FileText,
  content_block_version: Layers,
  work_product_ref: Boxes,
  work_product_version: Boxes,
  gap: FileQuestion
};

/** ContentUnit is atomic and has a single real `unitType` in this dataset ("slide"), so canvas
 * chips are iconified by *relationship type* (content unit / content block / work product ref /
 * gap) rather than a fabricated visual "kind" (Chart/Video/Testimonial) the API does not model. */
export function ObjectTypeIcon({ type, size = 12, className, color }: { type?: string | null; size?: number; className?: string; color?: string }) {
  const Icon = (type && ICONS[type]) || FileText;
  return <Icon size={size} className={className} color={color} aria-hidden={true} />;
}

export function DragHandleIcon({ size = 12 }: { size?: number }) {
  return <GripVertical size={size} aria-hidden="true" />;
}
