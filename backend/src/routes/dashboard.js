import { asyncRouter } from '../middleware/async-router.js';
import { db } from '../config/supabase.js';

const router = asyncRouter();
const businessTimeZone = 'Africa/Johannesburg';
const businessDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: businessTimeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const businessWeekday = new Intl.DateTimeFormat('en', {
  timeZone: businessTimeZone,
  weekday: 'short',
});

function startOfBusinessDay(date) {
  // Johannesburg stays on UTC+02:00 year-round.
  return new Date(`${businessDate.format(date)}T00:00:00+02:00`);
}

router.get('/dashboard', async (req, res) => {
  const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 7;
  const now = new Date();
  const today = startOfBusinessDay(now);
  const range = new Date(today);
  range.setUTCDate(range.getUTCDate() - days + 1);

  const [products, categories, sales, movements, low] = await Promise.all([
    db.from('products').select('id,quantity,min_stock_level', { count: 'exact' }),
    db.from('categories').select('id', { count: 'exact' }),
    db.from('sales').select('id,sale_number,created_at,total_amount,sale_items(quantity)')
      .gte('created_at', range.toISOString()).order('created_at', { ascending: false }).limit(1000),
    db.from('stock_movements').select('id,created_at,movement_type,quantity,products(name)')
      .order('created_at', { ascending: false }).limit(8),
    db.from('products').select('id,name,quantity,min_stock_level,unit').order('quantity').limit(100),
  ]);
  for (const result of [products, categories, sales, movements, low]) {
    if (result.error) throw result.error;
  }

  const allSales = sales.data || [];
  const todaySales = allSales.filter(sale => new Date(sale.created_at) >= today);
  const revenue = todaySales.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);
  const recentSales = todaySales.slice(0, 5).map(sale => ({
    ...sale,
    item_count: (sale.sale_items || []).reduce((sum, item) => sum + Number(item.quantity), 0),
  }));
  const revenueByDay = new Map();
  for (const sale of allSales) {
    const day = businessDate.format(new Date(sale.created_at));
    revenueByDay.set(day, (revenueByDay.get(day) || 0) + Number(sale.total_amount || 0));
  }
  const performance = [...revenueByDay].map(([day, total]) => ({
    day,
    label: businessWeekday.format(new Date(`${day}T12:00:00+02:00`)),
    revenue: total,
  })).reverse();

  res.json({
    summary: {
      total_products: products.count || 0,
      total_categories: categories.count || 0,
      total_stock_quantity: (products.data || []).reduce((sum, product) => sum + Number(product.quantity || 0), 0),
      sales_today: todaySales.length,
      revenue_today: revenue,
    },
    sales_performance: performance,
    low_stock: (low.data || []).filter(product => product.quantity <= product.min_stock_level).slice(0, 8),
    recent_sales: recentSales,
    recent_movements: (movements.data || []).map(movement => ({
      ...movement,
      product_name: movement.products?.name || 'Deleted product',
    })),
  });
});

export default router;
