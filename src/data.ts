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
  gstAmount?: number;
  gstRate?: number;
  gstType?: 'inclusive' | 'exclusive';
}

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv-1',
    invoiceNo: 'IP-2026-001',
    customerName: 'Amit Patel (Sharma Kirana)',
    customerPhone: '9876543210',
    items: [
      { id: 'item-1', name: 'Premium Basmati Rice (26kg)', quantity: 1, price: 2100 },
      { id: 'item-2', name: 'Refined Sunflower Oil (15L)', quantity: 2, price: 1850 },
      { id: 'item-3', name: 'Tata Tea Gold (1kg)', quantity: 5, price: 420 },
    ],
    date: '2026-06-03',
    status: 'Paid',
    totalAmount: 7900,
  },
  {
    id: 'inv-2',
    invoiceNo: 'IP-2026-002',
    customerName: 'Rajesh Verma',
    customerPhone: '9123456789',
    items: [
      { id: 'item-4', name: 'Surya LED Bulbs 12W', quantity: 10, price: 120 },
      { id: 'item-5', name: 'PolyCab Copper Cable 90m', quantity: 1, price: 3400 },
    ],
    date: '2026-06-02',
    status: 'Pending',
    totalAmount: 4600,
  },
  {
    id: 'inv-3',
    invoiceNo: 'IP-2026-003',
    customerName: 'Karan Mehra',
    customerPhone: '9812345670',
    items: [
      { id: 'item-6', name: 'Britannia Marie Gold Family pack', quantity: 20, price: 35 },
      { id: 'item-7', name: 'Cadbury Dairy Milk Silk', quantity: 15, price: 80 },
    ],
    date: '2026-06-01',
    status: 'Paid',
    totalAmount: 1900,
  },
  {
    id: 'inv-4',
    invoiceNo: 'IP-2026-004',
    customerName: 'Sunita Deshmukh',
    customerPhone: '9345678901',
    items: [
      { id: 'item-8', name: 'Aashirvaad Shudh Chakki Atta (10kg)', quantity: 4, price: 460 },
      { id: 'item-9', name: 'Amul Butter 500g', quantity: 6, price: 275 },
    ],
    date: '2026-05-31',
    status: 'Pending',
    totalAmount: 3490,
  },
  {
    id: 'inv-5',
    invoiceNo: 'IP-2026-005',
    customerName: 'Pooja General Store',
    customerPhone: '9001234567',
    items: [
      { id: 'item-10', name: 'Fortune Soyabean Oil 1L', quantity: 30, price: 145 },
    ],
    date: '2026-05-30',
    status: 'Pending',
    totalAmount: 4350,
  }
];

export const SUGGESTED_ITEMS = [
  { name: 'Basmati Rice 1kg', price: 95 },
  { name: 'Fortune Mustard Oil 1L', price: 175 },
  { name: 'Aashirvaad Atta 5kg', price: 245 },
  { name: 'Amul Butter 100g', price: 58 },
  { name: 'Maggie Noodles pack of 12', price: 168 },
  { name: 'Surf Excel Easy Wash 1kg', price: 140 },
  { name: 'Dettol Liquid Handwash 750ml', price: 119 },
];
