import { ReserveViewport } from "@/components/ui/ReserveViewport";

// The pages below stream after this layout: reserve the viewport so the footer cannot paint above the arriving content (CLS).
export default function Layout({ children }: { children: React.ReactNode }) {
  return <ReserveViewport>{children}</ReserveViewport>;
}
