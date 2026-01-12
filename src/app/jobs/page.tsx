"use client";

import { Suspense } from "react";
import JobsPageContent from "./jobs-content";
import Footer from "@/components/Footer";

export default function JobsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Suspense fallback={
        <div className="text-center py-12">
          <p className="text-gray-600">Loading jobs...</p>
        </div>
      }>
        <JobsPageContent />
      </Suspense>
      <Footer />
    </div>
  );
}
