"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useResume } from "@/lib/hooks/use-api";

export default function ResumeDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data: resume, isLoading } = useResume(id);

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!resume) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">Resume not found.</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/resume">Back to resumes</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link href="/resume">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to resumes
        </Link>
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-2xl">{resume.title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Created {new Date(resume.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {resume.isBase ? <Badge variant="secondary">Base</Badge> : null}
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap rounded-md bg-muted p-6 font-mono text-sm">
            {resume.content}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
