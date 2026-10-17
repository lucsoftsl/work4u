import { AuthGate } from "@/b2b/components/shell/AuthGate";

// Everything under /ops except the sign-in and start pages needs a signed-in person.
export default function OpsGatedLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
