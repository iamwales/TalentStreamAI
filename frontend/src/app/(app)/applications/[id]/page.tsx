import ApplicationDetailPage from "./application-detail-page";

/** `output: "export"`: allow dynamic segment without pre-built paths (see next/dist/build revalidate check). */
export const revalidate = 0;

export function generateStaticParams() {
  return [] as { id: string }[];
}

export default function ApplicationByIdPage() {
  return <ApplicationDetailPage />;
}
