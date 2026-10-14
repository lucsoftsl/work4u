import { notFound } from "next/navigation";

// With several root layouts there is no global not-found page: unknown URLs end here and render (app)/not-found.tsx with a real 404 status.
export default function Missing() {
  notFound();
}
