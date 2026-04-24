import { Badge } from "@/components/ui/badge";
import type { ApplicationStatus } from "@/lib/types";

const LABELS: Record<ApplicationStatus, string> = {
  draft: "Draft",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

const VARIANTS: Record<
  ApplicationStatus,
  "secondary" | "keyword" | "section" | "score" | "destructive"
> = {
  draft: "secondary",
  applied: "keyword",
  interview: "section",
  offer: "score",
  rejected: "destructive",
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}
