"use client";

import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";

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
import {
  useApplications,
  useDashboardStats,
  useProfile,
} from "@/lib/hooks/use-api";

export default function DashboardPage() {
  const { data: profile } = useProfile();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: applications, isLoading: appsLoading } = useApplications();

  const recent = (applications ?? []).slice(0, 5);

  const statCards = [
    { label: "Applications", value: stats?.applications ?? 0 },
    { label: "Interviews", value: stats?.interviews ?? 0 },
    {
      label: "Avg. match score",
      value: stats ? `${stats.averageMatchScore}%` : "—",
    },
    { label: "Resumes generated", value: stats?.resumesGenerated ?? 0 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back{profile?.fullName ? `, ${profile.fullName.split(" ")[0]}` : ""}.
          </h1>
          <p className="mt-1 text-muted-foreground">
            Your AI co-pilot is ready to help you land your next role.
          </p>
        </div>
        <Button asChild>
          <Link href="/apply">
            <Plus className="mr-2 h-4 w-4" />
            New application
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-3xl font-semibold tracking-tight">
                  {stat.value}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent applications</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/applications">
              View all
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {appsLoading ? (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          ) : recent.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No applications yet. Paste a job description on the Apply page to get started.
              </p>
              <Button asChild className="mt-4">
                <Link href="/apply">Create your first application</Link>
              </Button>
            </div>
          ) : (
            recent.map((app) => (
              <Link
                key={app.id}
                href={`/applications?applicationId=${app.id}`}
                className="flex items-start justify-between gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/40"
              >
                <div className="space-y-1">
                  <p className="font-medium">{app.position}</p>
                  <p className="text-sm text-muted-foreground">{app.company}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(app.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <MatchBadge score={app.matchScore} />
                  <StatusBadge status={app.status} />
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
