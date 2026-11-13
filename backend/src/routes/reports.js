import { asyncRouter } from '../middleware/async-router.js';
import { z } from 'zod';
import { db } from '../config/supabase.js';
import { validate } from '../middleware/validate.js';

const router = asyncRouter();
const reportQuery = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
}).superRefine(({ from, to }, context) => {
  if (from && to && from > to) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['to'], message: 'End date must be on or after the start date' });
  }
  if (from && to && to.valueOf() - from.valueOf() > 366 * 86400000) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['to'], message: 'Date range cannot exceed 366 days' });
  }
});

router.get('/reports', validate(reportQuery, 'query'), async (req, res) => {
  const now = new Date();
  const from = req.validated.query.from || new Date(now.valueOf() - 30 * 86400000);
  const to = req.validated.query.to || now;
  const [sales, products, movements] = await Promise.all([
    db.from('sales').select('id,created_at,total_amount,sale_items(product_id,quantity,unit_price,products(name))')
      .gte('created_at', from.toISOString()).lte('created_at', to.toISOString())
      .order('created_at', { ascending: false }),
    db.from('products').select('id,name,quantity,purchase_price,min_stock_level'),
    db.from('stock_movements').select('created_at,movement_type,quantity,reason,products(name)')
      .gte('created_at', from.toISOString()).lte('created_at', to.toISOString())
      .order('created_at', { ascending: false }).limit(500),
  ]);
  for (const result of [sales, products, movements]) {
    if (result.error) throw result.error;
  }

  const bestSellers = new Map();
  for (const sale of sales.data || []) {
    for (const item of sale.sale_items || []) {
      const entry = bestSellers.get(item.product_id) || {
        product: item.products?.name || 'Product',
        quantity: 0,
        revenue: 0,
      };
      entry.quantity += item.quantity;
      entry.revenue += item.quantity * Number(item.unit_price);
      bestSellers.set(item.product_id, entry);
    }
  }

  res.json({
    from: from.toISOString(),
    to: to.toISOString(),
    total_sales: (sales.data || []).length,
    total_revenue: (sales.data || []).reduce((sum, sale) => sum + Number(sale.total_amount), 0),
    best_sellers: [...bestSellers.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 10),
    low_stock: (products.data || []).filter(product => product.quantity <= product.min_stock_level),
    inventory_value: (products.data || []).reduce((sum, product) => sum + Number(product.quantity) * Number(product.purchase_price), 0),
    movements: movements.data || [],
  });
});

export default router;
