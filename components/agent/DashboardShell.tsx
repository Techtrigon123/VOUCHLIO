"use client";

import React, { Suspense, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AgentProvider, useAgent } from "@/components/agent/AgentProvider";
import { ActivationProvider } from "@/components/agent/ActivationGuide";
import { DocumentAccessProvider } from "@/components/agent/DocumentAccessWarning";
import AgentNavbar from "@/components/agent/AgentNavbar";
import AppFooter from "@/components/layout/AppFooter";
import UpgradePopup from "@/components/agent/UpgradePopup";
import { DashboardSkeleton, PageBodySkeleton } from "@/components/agent/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { needsQuickSetup } from "@/lib/agent/profile";

function Gate({ children }: { children: React.ReactNode }) {
  const { agent, loading } = useAgent();
  const router = useRouter();
  const pathname = usePathname();
  const mustSetup = !!agent && needsQuickSetup(agent);

  useEffect(() => {
    if (loading) return;
    if (!agent) router.replace(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
    else if (mustSetup) router.replace(`/setup?returnTo=${encodeURIComponent(pathname)}`);
  }, [agent, loading, mustSetup, pathname, router]);

  if (loading || !agent || mustSetup) return <DashboardSkeleton />;

  return (
    <ActivationProvider>
      <DocumentAccessProvider>
        <div className="min-h-screen bg-slate-50">
          <Suspense
            fallback={
              <div className="flex h-16 items-center border-b border-slate-200 bg-white px-4 sm:px-6 lg:pl-[17rem]">
                <Skeleton className="h-8 w-36" />
              </div>
            }
          >
            <AgentNavbar />
          </Suspense>
          <UpgradePopup />
          <main className="pb-28 transition-[padding] duration-200 lg:pl-[var(--sidebar-w,16rem)]">
            <Suspense fallback={<PageBodySkeleton />}>{children}</Suspense>
          </main>
          {/* Pinned to the bottom; main's pb-28 keeps the last content clear of it. */}
          <AppFooter fixed />
        </div>
      </DocumentAccessProvider>
    </ActivationProvider>
  );
}

/** Client shell for every /dashboard page: session gate, navbar and providers. */
export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <AgentProvider>
      <Gate>{children}</Gate>
    </AgentProvider>
  );
}
