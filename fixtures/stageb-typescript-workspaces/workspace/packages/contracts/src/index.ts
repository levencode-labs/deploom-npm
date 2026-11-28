export interface Item {
  sku: string;
  unitCents: number;
  quantity: number;
}

export interface Invoice {
  currency: 'USD';
  items: readonly Item[];
}

export interface Receipt {
  currency: 'USD';
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
}

export const taxBasisPoints = 750;
