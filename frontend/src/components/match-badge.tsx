import { Badge } from "@/components/ui/badge";

type MatchBadgeProps = {
  score: number;
  className?: string;
};

export function MatchBadge({ score, className }: MatchBadgeProps) {
  const variant: "default" | "warning" | "destructive" =
    score >= 85 ? "default" : score >= 70 ? "warning" : "destructive";

  return (
    <Badge variant={variant} className={className}>
      {Math.round(score)}% match
    </Badge>
  );
}
