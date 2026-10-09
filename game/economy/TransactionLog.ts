export interface TransactionRecord {
  id: string;
  kind: "credit" | "debit";
  amount: number;
  label: string;
  at: string;
}

export class TransactionLog {
  private entries: TransactionRecord[];

  constructor(saved: TransactionRecord[] = []) {
    this.entries = saved.slice(0, 20).map((entry) => ({ ...entry }));
  }

  record(kind: TransactionRecord["kind"], amount: number, label: string) {
    this.entries.unshift({
      id: `${Date.now().toString(36)}-${Math.floor(Math.random() * 10_000).toString(36)}`,
      kind,
      amount: Math.max(0, Math.floor(amount)),
      label,
      at: new Date().toISOString(),
    });
    this.entries = this.entries.slice(0, 20);
  }

  recent(limit = 6) {
    return this.entries.slice(0, limit).map((entry) => ({ ...entry }));
  }
}
