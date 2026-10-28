import { parseBRLInput, formatBRL, maskBRLInput } from "@/utils/currency";

describe("currency", () => {
  it("parses masked BRL input as cents", () => {
    expect(parseBRLInput("1000")).toBe(10);
    expect(parseBRLInput("123456")).toBe(1234.56);
    expect(parseBRLInput("")).toBe(0);
  });

  it("formats BRL", () => {
    expect(formatBRL(1234.56)).toContain("1.234,56");
  });

  it("masks input progressively", () => {
    expect(maskBRLInput("1")).toBe("0,01");
    expect(maskBRLInput("1234")).toBe("12,34");
  });
});
