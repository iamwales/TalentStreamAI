import ResumeDetailPage from "./resume-detail-page";

export const revalidate = 0;

export function generateStaticParams() {
  return [] as { id: string }[];
}

export default function ResumeByIdPage() {
  return <ResumeDetailPage />;
}
