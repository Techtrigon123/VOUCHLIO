"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ArrowRight, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { BackButton } from "@/components/ui/back-button";

interface DocumentItem {
  _id: string;
  type: string;
  title: string;
  createdAt: string;
  status: string;
}

export default function EventsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([
    { _id: "1", type: "hotel-voucher", title: "Sunrise Grand Hotel - Alex Morgan", createdAt: new Date().toISOString(), status: "completed" },
    { _id: "2", type: "gst-invoice", title: "GST Invoice #INV-1042", createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(), status: "completed" },
    { _id: "3", type: "travel-quotation", title: "Dubai Package Quotation", createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), status: "completed" },
  ]);
  const [loading] = useState(false);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <BackButton fallback="/dashboard" />
            <h1 className="text-2xl font-bold text-[var(--foreground)]">Documents</h1>
          </div>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5 pl-12">Your recent travel documents</p>
        </div>
        <Link href="/dashboard/vouchers/new">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Create Document
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 rounded-lg border border-[var(--border)] bg-slate-50 animate-pulse" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm font-medium text-[var(--foreground)]">No documents yet</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">Create your first travel document to see it here.</p>
              <Link href="/dashboard/vouchers/new" className="mt-4">
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                  Create a document
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {documents.map((doc: DocumentItem) => (
                <Link
                  key={doc._id}
                  href={`/dashboard/events/${doc._id}`}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--foreground)] truncate">
                      {doc.title}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{formatDate(doc.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    <span className="text-xs text-[var(--muted-foreground)] capitalize">
                      {doc.type.replace(/-/g, " ")}
                    </span>
                    <Badge variant={doc.status === "completed" ? "success" : "secondary"} className="text-xs">
                      {doc.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}