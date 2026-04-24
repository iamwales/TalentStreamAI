import { Badge } from "@/components/ui/badge";

type MatchBadgeProps = {
  score: number;
  className?: string;
};

export function MatchBadge({ score, className }: MatchBadgeProps) {
  const variant: "score" | "warning" | "destructive" =
    score >= 85 ? "score" : score >= 70 ? "warning" : "destructive";

  return (
    <Badge variant={variant} className={className}>
      {Math.round(score)}% match
    </Badge>
  );
}
