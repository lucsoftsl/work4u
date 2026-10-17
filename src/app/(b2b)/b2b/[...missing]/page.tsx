import { notFound } from "next/navigation";

// Unknown URLs inside the B2B app resolve here (not to the marketplace catch-all), so the 404 keeps the B2B root layout.
export default function Missing() {
  notFound();
}
