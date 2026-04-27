"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";

import { MatchBadge } from "@/components/match-badge";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApplication, useResume } from "@/lib/hooks/use-api";

export default function ApplicationDetailClient({
  applicationId,
}: {
  applicationId?: string;
}) {
  const params = useParams<{ id: string }>();
  const id = applicationId ?? params?.id;

  const { data: application, isLoading } = useApplication(id);
  const { data: resume } = useResume(application?.resumeId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">Application not found.</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/applications">Back to applications</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href="/applications">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to applications
          </Link>
        </Button>
      </div>

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {application.position}
          </h1>
          <p className="mt-1 text-muted-foreground">{application.company}</p>
          {application.jobUrl ? (
            <a
              href={application.jobUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-sm text-primary underline-offset-4 hover:underline"
            >
              View original posting
            </a>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <MatchBadge score={application.matchScore} />
          <StatusBadge status={application.status} />
        </div>
      </div>

      <Tabs defaultValue="job" className="space-y-4">
        <TabsList>
          <TabsTrigger value="job">Job description</TabsTrigger>
          <TabsTrigger value="resume">Tailored resume</TabsTrigger>
          <TabsTrigger value="cover">Cover letter</TabsTrigger>
          <TabsTrigger value="gaps">Gap analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="job">
          <Card>
            <CardHeader>
              <CardTitle>Job description</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap rounded-md bg-muted p-4 text-sm">
                {application.jobDescription}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resume">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tailored resume</CardTitle>
              {resume ? (
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              ) : null}
            </CardHeader>
            <CardContent>
              {resume ? (
                <pre className="whitespace-pre-wrap rounded-md bg-muted p-4 font-mono text-sm">
                  {resume.content}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No tailored resume yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cover">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Cover letter</CardTitle>
              {application.coverLetter ? (
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              ) : null}
            </CardHeader>
            <CardContent>
              {application.coverLetter ? (
                <pre className="whitespace-pre-wrap rounded-md bg-muted p-4 text-sm">
                  {application.coverLetter}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No cover letter generated yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gaps">
          <Card>
            <CardHeader>
              <CardTitle>Gap analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(application.gaps ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No gaps detected — your profile aligns well with this role.
                </p>
              ) : (
                (application.gaps ?? []).map((gap) => (
                  <div
                    key={gap.skill}
                    className="flex items-start justify-between gap-4 rounded-md border p-3"
                  >
                    <div>
                      <p className="font-medium">{gap.skill}</p>
                      {gap.note ? (
                        <p className="text-sm text-muted-foreground">
                          {gap.note}
                        </p>
                      ) : null}
                    </div>
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      {gap.severity}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
