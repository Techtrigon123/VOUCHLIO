import React from "react";
import Link from "next/link";

export default function CTASection() {
  return (
    <section className="on-accent py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Ready to simplify your travel documents?
        </h2>
        <p className="text-lg text-slate-400 mb-10 max-w-xl mx-auto">
          Create a free account and start generating professional travel documents in minutes.
        </p>
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-slate-400">
            Already have an account?{" "}
            <Link href="/login" className="text-slate-300 underline underline-offset-4 hover:text-white">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}