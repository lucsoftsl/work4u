"use client";

import { Suspense } from "react";
import JobsPageContent from "./jobs-content";
import Footer from "@/components/Footer";

export default function JobsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading jobs...</p>
        </div>
      }>
        <JobsPageContent />
      </Suspense>
      <Footer />
    </div>
  );
}
