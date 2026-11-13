import { asyncRouter } from '../middleware/async-router.js';
import { db } from '../config/supabase.js';
import { requireAdmin } from '../middleware/auth.js';
const router=asyncRouter();
for(const resource of ['products','categories','suppliers','sales','purchases','stock_movements'])router.get(`/${resource.replace('_','-')}`,async(req,res)=>{const {data,error}=await db.from(resource).select('*').order('created_at',{ascending:false}).limit(200);if(error)return res.status(500).json({error:error.message});res.json({items:data});});
router.get('/me',async(req,res)=>{const {data,error}=await db.from('profiles').select('id,full_name,role').eq('id',req.user.id).single();if(error)return res.status(404).json({error:'User profile not found'});res.json({item:data});});
router.get('/users',requireAdmin,async(_req,res)=>{const {data,error}=await db.from('profiles').select('id,full_name,role,created_at').order('created_at',{ascending:false});if(error)return res.status(500).json({error:error.message});res.json({items:data});});
router.get('/settings',(_req,res)=>res.json({item:{currency:'USD',timezone:'Africa/Johannesburg',low_stock:'Product minimum stock level'}}));
export default router;
