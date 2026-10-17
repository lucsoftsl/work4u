import type { Metadata } from "next";
import { SignInView } from "@/components/b2b-auth/SignInView";

export const metadata: Metadata = { title: "Sign in" };

export default function B2bSignInPage() {
  return <SignInView />;
}
