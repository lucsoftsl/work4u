import { serializeJsonLd, type JsonLdObject } from "@/lib/seo/jsonld";

/** Renders structured data into the server HTML. Pass null to render nothing. */
export function JsonLd({ data }: { data: JsonLdObject | JsonLdObject[] | null | undefined }) {
  if (!data || (Array.isArray(data) && data.length === 0)) return null;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
