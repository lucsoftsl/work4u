import { describe, expect, it } from "vitest";
import en from "../locales/en.json";
import hu from "../locales/hu.json";
import fr from "../locales/fr.json";
import es from "../locales/es.json";
import ro from "../locales/ro.json";

// Product rule: phone/WhatsApp contact is not offered inside work4u, so no plan may advertise it.
describe("pricing copy", () => {
  for (const [name, dict] of Object.entries({ en, hu, fr, es, ro }) as Array<[string, Record<string, string>]>) {
    it(`${name}: no pricing.* string mentions WhatsApp`, () => {
      const offenders = Object.entries(dict).filter(([k, v]) => k.startsWith("pricing.") && /whatsapp/i.test(v));
      expect(offenders).toEqual([]);
    });
  }
});
