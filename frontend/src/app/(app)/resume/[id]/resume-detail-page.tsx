"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useRef } from "react";
import { ArrowLeft, Download, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/error-message";
import {
  useResume,
  useSetBaseResume,
  useUploadBaseResume,
} from "@/lib/hooks/use-api";

const ACCEPTED = ".pdf,.doc,.docx,.txt";

export default function ResumeDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const { data: resume, isLoading } = useResume(id);
  const setBase = useSetBaseResume();
  const uploadBase = useUploadBaseResume();

  function handleUploadNewBase(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    uploadBase.mutate(file, {
      onSuccess: (data) => {
        toast.success("New base resume uploaded.");
        router.push(`/resume/${data.id}`);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

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
          <div className="flex flex-wrap items-center justify-end gap-2">
            {resume.isBase ? <Badge variant="secondary">Base</Badge> : null}
            {resume.isBase ? null : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={setBase.isPending || uploadBase.isPending}
                onClick={() => {
                  setBase.mutate(resume.id, {
                    onSuccess: () =>
                      toast.success("This resume is now your base resume."),
                    onError: (e) => toast.error(getErrorMessage(e)),
                  });
                }}
              >
                Set as base
              </Button>
            )}
            <input
              ref={uploadInputRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={handleUploadNewBase}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadBase.isPending || setBase.isPending}
              onClick={() => uploadInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload new base resume
            </Button>
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
