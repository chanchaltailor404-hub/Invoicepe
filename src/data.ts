export interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  customerName: string;
  customerPhone: string;
  items: InvoiceItem[];
  date: string;
  status: 'Paid' | 'Pending';
  totalAmount: number;
  gstRate: number;
  gstAmount: number;
  gstType: 'inclusive' | 'exclusive';
}

export interface UdhaarEntry {
  id: string;
  user_id?: string;
  customer_name: string;
  phone: string;
  amount: number;
  note: string;
  status: 'Paid' | 'Unpaid';
  created_at?: string;
}

export const SUGGESTED_ITEMS = [
  { name: 'Milk (दूध)', price: 30 },
  { name: 'Sugar (चीनी)', price: 45 },
  { name: 'Tea Powder (चाय पत्ती)', price: 120 },
  { name: 'Wheat Flour / Atta (आटा)', price: 50 },
  { name: 'Rice (चावल)', price: 60 },
  { name: 'Cooking Oil (तेल)', price: 180 },
  { name: 'Soap (साबुन)', price: 25 },
  { name: 'Salt (नमक)', price: 20 },
  { name: 'Pulses / Dal (दाल)', price: 110 }
];

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'demo-1',
    invoiceNo: 'INV-2026-001',
    customerName: 'Rajesh Kumar',
    customerPhone: '9876543210',
    items: [
      { id: 'item-1', name: 'Wheat Flour / Atta', quantity: 5, price: 50 },
      { id: 'item-2', name: 'Sugar', quantity: 2, price: 45 }
    ],
    date: new Date().toISOString().split('T')[0],
    status: 'Paid',
    totalAmount: 340,
    gstRate: 18,
    gstAmount: 51.86,
    gstType: 'inclusive'
  },
  {
    id: 'demo-2',
    invoiceNo: 'INV-2026-002',
    customerName: 'Sanjay Sharma',
    customerPhone: '9988776655',
    items: [
      { id: 'item-3', name: 'Cooking Oil', quantity: 2, price: 180 },
      { id: 'item-4', name: 'Tea Powder', quantity: 1, price: 120 }
    ],
    date: new Date().toISOString().split('T')[0],
    status: 'Pending',
    totalAmount: 480,
    gstRate: 18,
    gstAmount: 73.22,
    gstType: 'inclusive'
  }
];
