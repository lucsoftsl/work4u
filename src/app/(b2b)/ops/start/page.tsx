import type { Metadata } from "next";
import { StartView } from "@/components/b2b-auth/StartView";

export const metadata: Metadata = { title: "Set up your company" };

export default function B2bStartPage() {
  return <StartView />;
}
