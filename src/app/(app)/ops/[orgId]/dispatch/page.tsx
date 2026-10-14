import { redirect } from "next/navigation";

export default async function DispatchIndex({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  redirect(`/ops/${orgId}/dispatch/board`);
}
