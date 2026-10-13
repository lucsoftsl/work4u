// Deep links into /chat (handled in src/app/chat/page.tsx): start or open a conversation,
// optionally scoped to a job thread.
export function chatHref(params: {
  userId: string;
  userName?: string | null;
  jobId?: string | null;
  jobTitle?: string | null;
}): string {
  const search = new URLSearchParams({ userId: params.userId });
  if (params.userName) search.set("userName", params.userName);
  if (params.jobId) search.set("jobId", params.jobId);
  if (params.jobTitle) search.set("jobTitle", params.jobTitle);
  return `/chat?${search.toString()}`;
}
