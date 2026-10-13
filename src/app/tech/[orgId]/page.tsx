import { redirect } from "next/navigation";

export default async function TechIndex({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  redirect(`/tech/${orgId}/today`);
}
