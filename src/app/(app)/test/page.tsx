import { notFound } from "next/navigation";

// Leftover dev page: no longer reachable. Kept as a 404 (instead of deleting the folder) so old links and
// already-indexed URLs get a real "not found" status.
export default function TestRoute() {
  notFound();
}
