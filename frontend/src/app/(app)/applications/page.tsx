"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { MatchBadge } from "@/components/match-badge";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApplications } from "@/lib/hooks/use-api";
import ApplicationDetailClient from "./[id]/application-detail-client";

export default function ApplicationsPage() {
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const { data: applications, isLoading } = useApplications();

  useEffect(() => {
    setSelectedApplicationId(new URLSearchParams(window.location.search).get("applicationId"));
  }, []);

  if (selectedApplicationId) {
    return <ApplicationDetailClient applicationId={selectedApplicationId} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
          <p className="mt-1 text-muted-foreground">
            Track every job you&apos;ve tailored an application for.
          </p>
        </div>
        <Button asChild>
          <Link href="/apply">
            <Plus className="mr-2 h-4 w-4" />
            New application
          </Link>
        </Button>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </>
        ) : (applications ?? []).length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No applications yet.
              </p>
              <Button asChild className="mt-4">
                <Link href="/apply">Create your first application</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          (applications ?? []).map((app) => (
            <Link
              key={app.id}
              href={`/applications?applicationId=${app.id}`}
              className="block"
            >
              <Card className="transition-colors hover:bg-accent/40">
                <CardContent className="flex items-start justify-between gap-4 py-5">
                  <div className="space-y-1">
                    <p className="text-lg font-semibold">{app.position}</p>
                    <p className="text-sm text-muted-foreground">{app.company}</p>
                    <p className="text-xs text-muted-foreground">
                      Applied {new Date(app.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <MatchBadge score={app.matchScore} />
                    <StatusBadge status={app.status} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
