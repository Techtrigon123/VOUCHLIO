"use client";

import React, { Suspense, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AgentProvider, useAgent } from "@/components/agent/AgentProvider";
import { ActivationProvider } from "@/components/agent/ActivationGuide";
import { DocumentAccessProvider } from "@/components/agent/DocumentAccessWarning";
import AgentNavbar from "@/components/agent/AgentNavbar";
import AppFooter from "@/components/layout/AppFooter";
import UpgradePopup from "@/components/agent/UpgradePopup";
import RenewalPopup from "@/components/agent/RenewalPopup";
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
              <div className="flex h-[72px] items-center border-b-2 border-[var(--primary)] bg-white px-4 sm:px-6 xl:h-[84px] xl:px-10">
                <Skeleton className="h-8 w-36" />
              </div>
            }
          >
            <AgentNavbar />
          </Suspense>
          <UpgradePopup />
          <RenewalPopup />
          <main className="pb-28">
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
