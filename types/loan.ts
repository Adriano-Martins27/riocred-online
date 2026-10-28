export type InterestMode = "per_installment" | "on_contract";
export type LoanFrequency = "monthly" | "biweekly" | "weekly" | "daily";
export type InstallmentStatus = "pending" | "partial" | "paid" | "overdue";
export type LoanStatus = "active" | "paid";
export type LateFeeMode =
  | "none"
  | "percent_installment_daily"
  | "percent_total_daily"
  | "fixed_daily";

export type PaymentType = "installment" | "full_payoff" | "interest_only";
export type PaymentMethod = "pix" | "cash" | "transfer" | "other";

export type Loan = {
  $id: string;
  ownerId: string;
  customerId: string;
  customerName: string;
  principal: number;
  interestRate: number;
  interestMode: InterestMode;
  frequency: LoanFrequency;
  installmentCount: number;
  startDate: string;
  firstDueDate: string;
  skipWeekends: boolean;
  lateFeeMode: LateFeeMode;
  lateFeeValue: number;
  totalInterest: number;
  totalReceivable: number;
  status: LoanStatus;
  clientRequestId: string;
  /** Funcionário responsável pelo contrato. */
  managerId: string;
  managerName: string;
  $createdAt: string;
};

export type LoanInstallment = {
  $id: string;
  loanId: string;
  ownerId: string;
  installmentNumber: number;
  dueDate: string;
  scheduledAmount: number;
  paidAmount: number;
  status: InstallmentStatus;
};

export type LoanPayment = {
  $id: string;
  loanId: string;
  installmentId: string;
  ownerId: string;
  amount: number;
  interestAmount: number;
  principalAmount: number;
  discountAmount: number;
  paymentMethod: PaymentMethod;
  paymentType: PaymentType;
  notes: string;
  paidAt: string;
  $createdAt: string;
};

export type LoanInput = {
  customerId: string;
  customerName: string;
  principal: number;
  interestRate: number;
  interestMode: InterestMode;
  frequency: LoanFrequency;
  installmentCount: number;
  startDate: string;
  firstDueDate: string;
  skipWeekends: boolean;
  lateFeeMode?: LateFeeMode;
  lateFeeValue?: number;
  managerId?: string;
  managerName?: string;
};

export type PaymentInput = {
  installment: LoanInstallment;
  amount: number;
  discountAmount: number;
  paymentMethod: PaymentMethod;
  paymentType: PaymentType;
  notes: string;
  paidAt: string;
  interestAmount: number;
  principalAmount: number;
  rescheduleDate?: string;
};

export type SimulatedInstallment = {
  installmentNumber: number;
  dueDate: string;
  scheduledAmount: number;
};

export type LoanSimulation = {
  totalInterest: number;
  installmentAmount: number;
  totalReceivable: number;
  effectiveRate: number;
  installments: SimulatedInstallment[];
};

export type DerivedLoanStatus =
  | "Em dia"
  | "Próximo do vencimento"
  | "Em atraso"
  | "Quitado";
