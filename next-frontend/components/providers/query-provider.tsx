"use client"

import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  MutationCache,
} from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { toast } from "sonner"

const queryCache = new QueryCache({
  onError: (err: unknown, query) => {
    console.error(`[QUERY ERROR] Key: ${JSON.stringify(query.queryKey)}`, err)
    const message =
      (err as any)?.response?.data?.errorMessage ||
      (err as any)?.response?.data?.message ||
      (err as any)?.message ||
      "Something went wrong"
    toast.error(message)
  },
  onSuccess: (data: unknown, query) => {
    console.log(`[QUERY SUCCESS] Key: ${JSON.stringify(query.queryKey)}`, data)
    if ((data as any)?.data.message) toast.success((data as any).data.message)
  },
})

const mutationCache = new MutationCache({
  onSuccess: (data: unknown) => {
    console.log("[MUTATION SUCCESS]", data)
    if ((data as any)?.data.message) toast.success((data as any).data.message)
  },
  onError: (err: unknown) => {
    console.error("[MUTATION ERROR]", err)
    const message =
      (err as any)?.errorMessage ||
      (err as any)?.message ||
      "Something went wrong"
    toast.error(message)
    // Auto-logout logic here
    if (
      (err as any)?.response?.status === 401 ||
      (err as any)?.error?.code === "AUTH_TOKEN_NOT_FOUND"
    ) {
      console.warn("401 detected - logging out")
      // clearAuthCookies()
      // window.location.href = '/login'
    }
  },
})

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 1000 * 60, // 1 minute
        gcTime: 1000 * 60 * 5, // 5 minutes
      },
      mutations: {}, // Empty now; handlers moved to mutationCache
    },
    queryCache,
    mutationCache,
  })

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} position="bottom" />
    </QueryClientProvider>
  )
}
