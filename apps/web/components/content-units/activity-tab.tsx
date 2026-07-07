import { Card } from "@/components/ui";
import type { ActivityEvent } from "@/features/content-units/lib";
import { ActivityTimeline } from "./activity-timeline";

export function ActivityTab({ events }: { events: ActivityEvent[] }) {
  return (
    <Card className="mt-5 p-4">
      <ActivityTimeline events={events} />
    </Card>
  );
}
