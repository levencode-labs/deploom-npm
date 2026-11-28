import { taxBasisPoints, type Invoice, type Receipt } from '@deploom-stageb/contracts';

export function priceInvoice(invoice: Invoice): Receipt {
  const subtotalCents = invoice.items.reduce((sum, item) => sum + item.unitCents * item.quantity, 0);
  const taxCents = Math.round(subtotalCents * taxBasisPoints / 10000);
  return { currency: invoice.currency, subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}
