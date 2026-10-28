import {
  canManagerAssignRoute,
  buildRouteManagerNames,
  filterCustomersByRoutes,
  filterLoansForManager,
  filterRoutesForManager,
  loanBelongsToManager,
  routeIdsForManager,
} from "@/utils/manager-scope";
import type { Customer } from "@/types/customer";
import type { Loan } from "@/types/loan";

const customers: Customer[] = [
  {
    $id: "c1",
    ownerId: "mgr1",
    fullName: "A",
    cpf: "",
    phone: "",
    clientType: "PF",
    billingType: "emprestimo",
    referrerName: "",
    referrerPhone: "",
    routeId: "r1",
    active: true,
    zipCode: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    reference: "",
    photoFileId: "",
    photoUpdatedAt: "",
    clientRequestId: "",
    $createdAt: "",
  },
  {
    $id: "c2",
    ownerId: "mgr1",
    fullName: "B",
    cpf: "",
    phone: "",
    clientType: "PF",
    billingType: "emprestimo",
    referrerName: "",
    referrerPhone: "",
    routeId: "r2",
    active: true,
    zipCode: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    reference: "",
    photoFileId: "",
    photoUpdatedAt: "",
    clientRequestId: "",
    $createdAt: "",
  },
];

const loans: Loan[] = [
  {
    $id: "l1",
    ownerId: "mgr1",
    customerId: "c1",
    customerName: "A",
    principal: 100,
    interestRate: 10,
    interestMode: "on_contract",
    frequency: "monthly",
    installmentCount: 1,
    startDate: "2026-01-01",
    firstDueDate: "2026-02-01",
    skipWeekends: false,
    lateFeeMode: "none",
    lateFeeValue: 0,
    totalInterest: 10,
    totalReceivable: 110,
    status: "active",
    clientRequestId: "",
    managerId: "",
    managerName: "",
    $createdAt: "",
  },
  {
    $id: "l2",
    ownerId: "mgr1",
    customerId: "c2",
    customerName: "B",
    principal: 100,
    interestRate: 10,
    interestMode: "on_contract",
    frequency: "monthly",
    installmentCount: 1,
    startDate: "2026-01-01",
    firstDueDate: "2026-02-01",
    skipWeekends: false,
    lateFeeMode: "none",
    lateFeeValue: 0,
    totalInterest: 10,
    totalReceivable: 110,
    status: "active",
    clientRequestId: "",
    managerId: "",
    managerName: "",
    $createdAt: "",
  },
];

describe("manager-scope", () => {
  const allowed = new Set(["r1"]);

  it("limits routes and customers to assigned set", () => {
    const routes = filterRoutesForManager(
      [
        { $id: "r1", name: "A", createdBy: "x", $createdAt: "" },
        { $id: "r2", name: "B", createdBy: "x", $createdAt: "" },
      ],
      allowed,
    );
    expect(routes.map((r) => r.$id)).toEqual(["r1"]);

    const scopedCustomers = filterCustomersByRoutes(customers, allowed);
    expect(scopedCustomers.map((c) => c.$id)).toEqual(["c1"]);

    const scopedLoans = filterLoansForManager(loans, customers, "m1", allowed);
    expect(scopedLoans.map((l) => l.$id)).toEqual(["l1"]);
  });

  it("filters loans by managerId on contract", () => {
    const loanWithMgr = { ...loans[0]!, managerId: "m1", managerName: "Ana" };
    const loanOther = {
      ...loans[1]!,
      $id: "l2",
      customerId: "c2",
      managerId: "m2",
      managerName: "Bruno",
    };
    const scoped = filterLoansForManager(
      [loanWithMgr, loanOther],
      customers,
      "m1",
      allowed,
    );
    expect(scoped.map((l) => l.$id)).toEqual(["l1"]);
  });

  it("loanBelongsToManager uses managerId when present", () => {
    const loan = {
      ...loans[0]!,
      managerId: "m1",
      managerName: "Ana",
    };
    expect(
      loanBelongsToManager(
        loan,
        "m1",
        new Map([["c1", "r99"]]),
        new Set(["r99"]),
      ),
    ).toBe(true);
    expect(
      loanBelongsToManager(
        loan,
        "m2",
        new Map([["c1", "r1"]]),
        new Set(["r1"]),
      ),
    ).toBe(false);
  });

  it("blocks route assignment outside manager scope", () => {
    expect(canManagerAssignRoute("r1", allowed, false)).toBe(true);
    expect(canManagerAssignRoute("r2", allowed, false)).toBe(false);
    expect(canManagerAssignRoute("", allowed, false)).toBe(false);
    expect(canManagerAssignRoute("r2", allowed, true)).toBe(true);
  });

  it("maps manager to route ids and route to manager names", () => {
    const access = [
      { managerId: "m1", routeId: "r1" },
      { managerId: "m1", routeId: "r2" },
      { managerId: "m2", routeId: "r2" },
    ];
    const profiles = [
      { $id: "m1", fullName: "Ana", email: "a@x.com" },
      { $id: "m2", fullName: "Bruno", email: "b@x.com" },
    ];

    expect([...routeIdsForManager("m1", access)].sort()).toEqual(["r1", "r2"]);

    const names = buildRouteManagerNames(access, profiles);
    expect(names.get("r1")).toBe("Ana");
    expect(names.get("r2")).toBe("Ana, Bruno");
  });
});
