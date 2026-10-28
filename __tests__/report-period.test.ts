import { isValidDateRange, resolveReportPeriod } from "@/utils/report-period";

describe("report-period", () => {
  it("resolves custom date range", () => {
    const { since, until, label } = resolveReportPeriod({
      startDate: "2026-06-01",
      endDate: "2026-06-17",
    });
    expect(since.getFullYear()).toBe(2026);
    expect(until.getDate()).toBe(17);
    expect(label).toContain("01/06/2026");
  });

  it("validates date range", () => {
    expect(isValidDateRange("2026-06-01", "2026-06-17")).toBe(true);
    expect(isValidDateRange("2026-06-17", "2026-06-01")).toBe(false);
  });
});
