export type PayableStatus = "pending" | "paid";

export type Payable = {
  $id: string;
  ownerId: string;
  name: string;
  amount: number;
  dueDate: string;
  category: string;
  notes: string;
  status: PayableStatus;
  $createdAt: string;
};

export type PayableInput = Omit<
  Payable,
  "$id" | "$createdAt" | "ownerId"
>;

export const emptyPayable = (): PayableInput => ({
  name: "",
  amount: 0,
  dueDate: new Date().toISOString().slice(0, 10),
  category: "",
  notes: "",
  status: "pending",
});
