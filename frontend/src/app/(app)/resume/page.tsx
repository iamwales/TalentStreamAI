"use client";

import Link from "next/link";
import { FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useResumes } from "@/lib/hooks/use-api";

export default function ResumesPage() {
  const { data: resumes, isLoading } = useResumes();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resumes</h1>
          <p className="mt-1 text-muted-foreground">
            Your base resume and every tailored variant generated so far.
          </p>
        </div>
        <Button asChild>
          <Link href="/apply">Tailor a new resume</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {isLoading ? (
          <>
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </>
        ) : (resumes ?? []).length === 0 ? (
          <Card className="md:col-span-2">
            <CardContent className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No resumes yet.</p>
            </CardContent>
          </Card>
        ) : (
          (resumes ?? []).map((resume) => (
            <Link key={resume.id} href={`/resume/${resume.id}`} className="block">
              <Card className="h-full transition-colors hover:bg-accent/40">
                <CardContent className="space-y-3 py-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <p className="font-medium">{resume.title}</p>
                    </div>
                    {resume.isBase ? <Badge variant="secondary">Base</Badge> : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(resume.createdAt).toLocaleDateString()}
                  </p>
                  <p className="line-clamp-4 text-sm text-muted-foreground">
                    {resume.content}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
