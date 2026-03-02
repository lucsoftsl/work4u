import { validateLandingPayload } from "./landing-contract-lib.mjs";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const url = `${BASE_URL}/api/landing`;

async function main() {
  const response = await fetch(url, { headers: { Accept: "application/json" } });

  if (!response.ok) {
    console.error(`[landing-contract] ${url} returned HTTP ${response.status}`);
    process.exit(1);
  }

  const payload = await response.json();
  const errors = validateLandingPayload(payload);

  if (errors.length > 0) {
    console.error("[landing-contract] API contract validation failed:");
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  console.log("[landing-contract] /api/landing contract is valid.");
}

main().catch((error) => {
  console.error("[landing-contract] Unexpected error:", error);
  process.exit(1);
});
