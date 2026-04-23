"use client";

import { useAuth } from "@clerk/nextjs";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { mockApi } from "@/lib/mock-data";
import type {
  Application,
  DashboardStats,
  Profile,
  Resume,
  TailorRequest,
  TailorResponse,
} from "@/lib/types";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";

function useAuthedFetch() {
  const { getToken } = useAuth();

  return async function authedFetch<T>(
    path: string,
    init?: Parameters<typeof apiFetch>[1],
  ): Promise<T> {
    const token = await getToken();
    return apiFetch<T>(path, { ...init, token });
  };
}

export function useProfile(
  opts?: Omit<UseQueryOptions<Profile>, "queryKey" | "queryFn">,
) {
  const fetcher = useAuthedFetch();
  return useQuery<Profile>({
    queryKey: ["profile"],
    queryFn: () =>
      USE_MOCKS ? mockApi.getProfile() : fetcher<Profile>("/api/v1/profile"),
    ...opts,
  });
}

export function useDashboardStats() {
  const fetcher = useAuthedFetch();
  return useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: () =>
      USE_MOCKS
        ? mockApi.getStats()
        : fetcher<DashboardStats>("/api/v1/dashboard/stats"),
  });
}

export function useApplications() {
  const fetcher = useAuthedFetch();
  return useQuery<Application[]>({
    queryKey: ["applications"],
    queryFn: () =>
      USE_MOCKS
        ? mockApi.listApplications()
        : fetcher<Application[]>("/api/v1/applications"),
  });
}

export function useApplication(id: string | undefined) {
  const fetcher = useAuthedFetch();
  return useQuery<Application | undefined>({
    queryKey: ["application", id],
    enabled: Boolean(id),
    queryFn: () =>
      USE_MOCKS
        ? mockApi.getApplication(id!)
        : fetcher<Application>(`/api/v1/applications/${id}`),
  });
}

export function useResumes() {
  const fetcher = useAuthedFetch();
  return useQuery<Resume[]>({
    queryKey: ["resumes"],
    queryFn: () =>
      USE_MOCKS ? mockApi.listResumes() : fetcher<Resume[]>("/api/v1/resumes"),
  });
}

export function useResume(id: string | undefined) {
  const fetcher = useAuthedFetch();
  return useQuery<Resume | undefined>({
    queryKey: ["resume", id],
    enabled: Boolean(id),
    queryFn: () =>
      USE_MOCKS
        ? mockApi.getResume(id!)
        : fetcher<Resume>(`/api/v1/resumes/${id}`),
  });
}

export function useTailorApplication() {
  const fetcher = useAuthedFetch();
  const queryClient = useQueryClient();

  return useMutation<TailorResponse, Error, TailorRequest>({
    mutationFn: (payload) =>
      USE_MOCKS
        ? mockApi.tailor(payload)
        : fetcher<TailorResponse>("/api/v1/applications/tailor", {
            method: "POST",
            body: payload,
          }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useUploadBaseResume() {
  const fetcher = useAuthedFetch();
  const queryClient = useQueryClient();

  return useMutation<Resume, Error, File>({
    mutationFn: async (file) => {
      if (USE_MOCKS) {
        await new Promise((r) => setTimeout(r, 600));
        return {
          id: "base-1",
          title: file.name,
          isBase: true,
          content: "(parsed resume content will appear here)",
          createdAt: new Date().toISOString(),
        } satisfies Resume;
      }
      const form = new FormData();
      form.append("file", file);
      return fetcher<Resume>("/api/v1/profile/base-resume", {
        method: "POST",
        body: form,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
    },
  });
}
