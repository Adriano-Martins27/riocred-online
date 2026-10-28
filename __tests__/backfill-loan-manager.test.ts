import {
  buildRouteManagerMap,
  planLoanManagerBackfill,
} from "@/utils/backfill-loan-manager";

const profiles = [
  { id: "m1", name: "Ana", role: "manager", isApproved: true },
  { id: "m2", name: "Bruno", role: "manager", isApproved: true },
  { id: "admin", name: "Admin", role: "admin", isApproved: true },
];

describe("backfill-loan-manager", () => {
  it("maps route to approved manager", () => {
    const { routeManagerMap } = buildRouteManagerMap(
      [{ managerId: "m1", routeId: "r1" }],
      profiles,
    );
    expect(routeManagerMap.get("r1")).toEqual({
      managerId: "m1",
      managerName: "Ana",
    });
  });

  it("picks first manager by name when route has conflicts", () => {
    const { routeManagerMap, routeConflicts } = buildRouteManagerMap(
      [
        { managerId: "m2", routeId: "r1" },
        { managerId: "m1", routeId: "r1" },
      ],
      profiles,
    );
    expect(routeConflicts).toHaveLength(1);
    expect(routeManagerMap.get("r1")?.managerId).toBe("m1");
  });

  it("plans updates for loans without managerId", () => {
    const result = planLoanManagerBackfill(
      [
        {
          id: "l1",
          customerId: "c1",
          managerId: "",
          managerName: "",
        },
      ],
      [{ id: "c1", routeId: "r1" }],
      [{ managerId: "m1", routeId: "r1" }],
      profiles,
    );

    expect(result.updates).toHaveLength(1);
    expect(result.updates[0]).toMatchObject({
      loanId: "l1",
      managerId: "m1",
      managerName: "Ana",
      routeId: "r1",
    });
  });

  it("skips loans that already have managerId", () => {
    const result = planLoanManagerBackfill(
      [
        {
          id: "l1",
          customerId: "c1",
          managerId: "m2",
          managerName: "Bruno",
        },
      ],
      [{ id: "c1", routeId: "r1" }],
      [{ managerId: "m1", routeId: "r1" }],
      profiles,
    );

    expect(result.updates).toHaveLength(0);
    expect(result.skips[0]?.reason).toBe("já possui managerId");
  });

  it("force mode reassigns existing managerId", () => {
    const result = planLoanManagerBackfill(
      [
        {
          id: "l1",
          customerId: "c1",
          managerId: "m2",
          managerName: "Bruno",
        },
      ],
      [{ id: "c1", routeId: "r1" }],
      [{ managerId: "m1", routeId: "r1" }],
      profiles,
      { force: true },
    );

    expect(result.updates).toHaveLength(1);
    expect(result.updates[0]?.managerId).toBe("m1");
  });
});
