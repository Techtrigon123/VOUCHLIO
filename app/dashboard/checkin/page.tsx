"use client";

import React from "react";
import Link from "next/link";
import { Hotel, Receipt, FileText, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";

export default function CheckinPage() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <div className="flex items-center gap-3">
          <BackButton fallback="/dashboard" />
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Create Document</h1>
        </div>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5 pl-12">Jump straight into a travel document.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Start from a document type</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/dashboard/vouchers/new">
            <Button>
              <Hotel className="h-4 w-4" />
              Hotel Voucher
            </Button>
          </Link>
          <Link href="/dashboard/invoices?type=proforma&new=1">
            <Button variant="outline">
              <Receipt className="h-4 w-4" />
              Proforma Invoice
            </Button>
          </Link>
          <Link href="/dashboard/invoices?type=invoice&new=1">
            <Button variant="outline">
              <FileText className="h-4 w-4" />
              GST Invoice
            </Button>
          </Link>
          <Link href="/dashboard/invoices?type=receipt&new=1">
            <Button variant="outline">
              <CreditCard className="h-4 w-4" />
              Payment Receipt
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}