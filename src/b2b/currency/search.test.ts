import { describe, expect, it } from "vitest";
import { currencyLabel, groupCurrencies, searchCurrencies, type CurrencyInfo } from "./search";

const c = (code: string, name: string, symbol = code, popular = false, minorUnits = 2): CurrencyInfo => ({ code, name, symbol, minorUnits, popular });
// popular first (API order), then A-Z by name
const RO: CurrencyInfo[] = [
  c("EUR", "euro", "€", true), c("USD", "dolar american", "$", true), c("RON", "leu românesc", "RON", true),
  c("AUD", "dolar australian", "A$"), c("HUF", "forint maghiar", "Ft"), c("JPY", "yen japonez", "¥", false, 0), c("KWD", "dinar kuweitian", "KWD", false, 3),
  c("MDL", "leu moldovenesc"), c("ISK", "coroană islandeză", "kr", false, 0),
];

describe("currencyLabel", () => {
  it("shows code, localized name and symbol", () => expect(currencyLabel(c("EUR", "Euro", "€"))).toBe("EUR · Euro (€)"));
  it("is just the code when the name is not known", () => expect(currencyLabel(c("XOF", "", "XOF"))).toBe("XOF"));
  it("drops the symbol when it is the code", () => expect(currencyLabel(c("RON", "Romanian Leu", "RON"))).toBe("RON · Romanian Leu"));
});

describe("searchCurrencies: by code and by localized name", () => {
  const codes = (q: string) => searchCurrencies(RO, q).map((x) => x.code);
  it("empty query keeps the list order", () => expect(codes("")).toEqual(RO.map((x) => x.code)));
  it("finds by code, any case", () => { expect(codes("eur")[0]).toBe("EUR"); expect(codes("KwD")).toEqual(["KWD"]); });
  it("finds by the localized name, ignoring accents", () => {
    expect(codes("romanesc")).toEqual(["RON"]);
    expect(codes("coroana")).toEqual(["ISK"]);
    expect(codes("leu")).toEqual(["RON", "MDL"]);
  });
  it("finds by a word inside the name", () => expect(codes("japonez")).toEqual(["JPY"]));
  it("a code match comes before a name match", () => {
    const list = [c("AUD", "dolar australian"), c("XAU", "x"), c("DOL", "something")];
    expect(searchCurrencies(list, "dol").map((x) => x.code)).toEqual(["DOL", "AUD"]);
  });
  it("nothing matches nothing", () => expect(codes("zzzz")).toEqual([]));
  it("trims the query", () => expect(codes("  usd ")).toEqual(["USD"]));
});

describe("groupCurrencies", () => {
  it("without a query: popular group first, then everything else A to Z as given", () => {
    const g = groupCurrencies(RO, "");
    expect(g.map((x) => x.id)).toEqual(["popular", "all"]);
    expect(g[0].items.map((x) => x.code)).toEqual(["EUR", "USD", "RON"]);
    expect(g[1].items.map((x) => x.code)).toEqual(["AUD", "HUF", "JPY", "KWD", "MDL", "ISK"]);
  });
  it("with a query: one flat group of matches", () => {
    const g = groupCurrencies(RO, "leu");
    expect(g).toHaveLength(1);
    expect(g[0].id).toBe("results");
    expect(g[0].items.map((x) => x.code)).toEqual(["RON", "MDL"]);
  });
  it("no matches: no groups", () => expect(groupCurrencies(RO, "qqq")).toEqual([]));
});
