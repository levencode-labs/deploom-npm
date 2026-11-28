import { type Invoice, type Receipt } from '@deploom-stageb/contracts';
import { priceInvoice } from '@deploom-stageb/domain';

const invoice: Invoice = {
  currency: 'USD',
  items: [
    { sku: 'book', unitCents: 1000, quantity: 2 },
    { sku: 'pen', unitCents: 500, quantity: 1 },
  ],
};

const receipt: Receipt = priceInvoice(invoice);
console.log(JSON.stringify(receipt));
