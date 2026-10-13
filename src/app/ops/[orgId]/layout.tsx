import { OrgProvider } from "@/b2b/context/OrgContext";
import { OpsShell } from "@/b2b/components/shell/OpsShell";

export default async function OrgLayout({ children, params }: { children: React.ReactNode; params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  return (
    <OrgProvider orgId={orgId}>
      <OpsShell>{children}</OpsShell>
    </OrgProvider>
  );
}
