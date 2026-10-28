export type BillingType = "emprestimo" | "mensalidade" | "ambos";

export type Customer = {
  $id: string;
  ownerId: string;
  fullName: string;
  cpf: string;
  phone: string;
  clientType: string;
  billingType: BillingType;
  referrerName: string;
  referrerPhone: string;
  routeId: string;
  active: boolean;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  reference: string;
  photoFileId: string;
  photoUpdatedAt: string;
  clientRequestId: string;
  $createdAt: string;
};

export type CustomerInput = Omit<
  Customer,
  "$id" | "$createdAt" | "ownerId" | "clientRequestId"
> & {
  clientRequestId?: string;
};

export const emptyCustomerInput = (): CustomerInput => ({
  fullName: "",
  cpf: "",
  phone: "",
  clientType: "",
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
});
