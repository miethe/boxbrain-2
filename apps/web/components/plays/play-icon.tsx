import { Compass, Mountain, Rocket, Shield, TrendingUp } from "lucide-react";
import type { PlayIconKey } from "@/features/plays/data";

const iconMap: Record<PlayIconKey, typeof Mountain> = {
  mountain: Mountain,
  "trending-up": TrendingUp,
  rocket: Rocket,
  shield: Shield,
  compass: Compass
};

export function PlayIcon({ iconKey, size = 20 }: { iconKey: PlayIconKey; size?: number }) {
  const Icon = iconMap[iconKey];
  return <Icon size={size} color="#fff" aria-hidden="true" />;
}
