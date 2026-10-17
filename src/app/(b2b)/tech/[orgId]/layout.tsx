import { OrgProvider } from "@/b2b/context/OrgContext";
import { OfflineProvider } from "@/b2b/offline/OfflineProvider";
import { TechShell } from "@/b2b/components/tech/TechShell";

export default async function TechOrgLayout({ children, params }: { children: React.ReactNode; params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  return (
    <OrgProvider orgId={orgId} offlineCapable>
      <OfflineProvider>
        <TechShell>{children}</TechShell>
      </OfflineProvider>
    </OrgProvider>
  );
}
