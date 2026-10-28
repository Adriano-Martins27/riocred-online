import { scoreBand, calculateCustomerScore } from "@/utils/customer-score";
import type { Customer } from "@/types/customer";

const customer: Customer = {
  $id: "c1",
  ownerId: "o1",
  fullName: "Maria",
  cpf: "000",
  phone: "11999999999",
  clientType: "PF",
  billingType: "emprestimo",
  referrerName: "",
  referrerPhone: "",
  routeId: "",
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
  clientRequestId: "x",
  $createdAt: new Date().toISOString(),
};

describe("customer-score", () => {
  it("maps score bands", () => {
    expect(scoreBand(90)).toBe("Excelente");
    expect(scoreBand(75)).toBe("Bom");
    expect(scoreBand(60)).toBe("Atenção");
    expect(scoreBand(40)).toBe("Alto Risco");
  });

  it("scores customer with no loans highly", () => {
    const result = calculateCustomerScore(customer, [], []);
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.totalLoans).toBe(0);
  });
});
