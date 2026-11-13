import { asyncRouter } from '../middleware/async-router.js';
import { z } from 'zod';
import { db } from '../config/supabase.js';
import { requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = asyncRouter();
const optionalText = max => z.string().trim().max(max).nullable().optional();
const optionalBarcode = z.string().trim().max(80).nullable().optional()
  .transform(value => value === '' ? null : value);
const validDate = value => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
};
const optionalExpiry = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expiry date must use YYYY-MM-DD format')
  .refine(validDate, 'Expiry date must be a real calendar date')
  .nullable().optional();
const price = z.number().finite().min(0, 'Price cannot be negative').max(9_999_999_999.99, 'Price exceeds the supported maximum');
const nonNegativeInteger = z.number().int().min(0, 'Quantity cannot be negative').max(2_147_483_647, 'Quantity exceeds the supported maximum');

const schemas = {
  products: z.object({
    name: z.string().trim().min(1, 'Product name is required').max(160),
    barcode: optionalBarcode,
    category_id: z.string().uuid().nullable().optional(),
    description: optionalText(2000),
    purchase_price: price,
    selling_price: price,
    quantity: nonNegativeInteger,
    min_stock_level: nonNegativeInteger.default(0),
    unit: z.string().trim().min(1, 'Unit is required').max(24).default('pcs'),
    expiry_date: optionalExpiry,
    supplier_id: z.string().uuid().nullable().optional(),
  }),
  categories: z.object({
    name: z.string().trim().min(1, 'Category name is required').max(80),
    description: optionalText(1000),
  }),
  suppliers: z.object({
    name: z.string().trim().min(1, 'Supplier name is required').max(160),
    company_name: optionalText(160),
    phone: optionalText(40),
    email: z.string().trim().email('Enter a valid supplier email address').max(254).nullable().optional(),
    address: optionalText(500),
  }),
};
const idParams = z.object({ id: z.string().uuid('Record ID must be a valid UUID') });

for (const resource of Object.keys(schemas)) {
  router.post(`/${resource}`, requireAdmin, validate(schemas[resource]), async (req, res) => {
    const { data, error } = await db.from(resource).insert(req.validated.body).select().single();
    if (error) return res.status(error.code === '23505' ? 409 : 400).json({ error: error.message });
    res.status(201).json({ item: data });
  });

  router.put(`/${resource}/:id`, requireAdmin, validate(idParams, 'params'), validate(
    schemas[resource].partial().refine(body => Object.keys(body).length > 0, 'Provide at least one field to update'),
  ), async (req, res) => {
    const { data, error } = await db.from(resource)
      .update({ ...req.validated.body, updated_at: new Date().toISOString() })
      .eq('id', req.validated.params.id).select().maybeSingle();
    if (error) return res.status(error.code === '23505' ? 409 : 400).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Record not found' });
    res.json({ item: data });
  });

  router.delete(`/${resource}/:id`, requireAdmin, validate(idParams, 'params'), async (req, res) => {
    const { data, error } = await db.from(resource).delete().eq('id', req.validated.params.id).select('id').maybeSingle();
    if (error) return res.status(error.code === '23503' ? 409 : 400).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Record not found' });
    res.status(204).end();
  });
}

export default router;
