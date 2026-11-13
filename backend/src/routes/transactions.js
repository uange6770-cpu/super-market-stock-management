import { asyncRouter } from '../middleware/async-router.js';
import { z } from 'zod';
import { userDb } from '../config/supabase.js';
import { requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = asyncRouter();
const lineItems = z.array(z.object({
  product_id: z.string().uuid('Choose a valid product'),
  quantity: z.number().int().min(1, 'Quantity must be a whole number greater than zero').max(1_000_000, 'Quantity exceeds the transaction limit'),
  unit_cost: z.number().finite().min(0, 'Unit cost cannot be negative').max(9_999_999_999.99, 'Unit cost exceeds the supported maximum').optional(),
})).min(1, 'Add at least one item').max(100, 'A transaction can contain at most 100 different items')
  .superRefine((items, context) => {
    const seen = new Set();
    items.forEach((item, index) => {
      if (seen.has(item.product_id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, 'product_id'],
          message: 'A product can only appear once; combine its quantities into one line',
        });
      }
      seen.add(item.product_id);
    });
  });
const saleBody = z.object({ items: lineItems });
const purchaseBody = z.object({
  items: lineItems,
  supplier_id: z.string().uuid('Choose a valid supplier').nullable().optional(),
});
const stockMovementBody = z.object({
  product_id: z.string().uuid('Choose a valid product'),
  movement_type: z.enum(['in', 'out', 'adjustment'], { errorMap: () => ({ message: 'Choose stock in, stock out, or adjustment' }) }),
  quantity: z.number().int().min(0, 'Quantity cannot be negative').max(2_147_483_647, 'Quantity exceeds the supported maximum'),
  reason: z.string().trim().min(1, 'Enter a reason for the stock movement').max(500),
}).superRefine((movement, context) => {
  if (movement.movement_type !== 'adjustment' && movement.quantity < 1) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['quantity'],
      message: 'Stock in and stock out quantities must be greater than zero',
    });
  }
});

router.post('/sales', validate(saleBody), async (req, res) => {
  const { data, error } = await userDb(req.token).rpc('create_sale', { p_items: req.validated.body.items });
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ sale_id: data });
});

router.post('/purchases', requireAdmin, validate(purchaseBody), async (req, res) => {
  const { items, supplier_id } = req.validated.body;
  const { data, error } = await userDb(req.token).rpc('receive_stock', {
    p_items: items,
    p_supplier_id: supplier_id || null,
  });
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ purchase_id: data });
});

router.post('/stock-movements', requireAdmin, validate(stockMovementBody), async (req, res) => {
  const { product_id, movement_type, quantity, reason } = req.validated.body;
  const { data, error } = await userDb(req.token).rpc('adjust_stock', {
    p_product_id: product_id,
    p_movement_type: movement_type,
    p_quantity: quantity,
    p_reason: reason,
  });
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ item: data });
});

export default router;
