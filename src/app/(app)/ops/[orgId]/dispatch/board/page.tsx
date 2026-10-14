import { Suspense } from "react";
import { DispatchBoardPage } from "@/b2b/components/dispatch/DispatchBoardPage";
import { BoardSkeleton } from "@/b2b/components/dispatch/BoardView";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 md:p-6"><BoardSkeleton /></div>}>
      <DispatchBoardPage />
    </Suspense>
  );
}
