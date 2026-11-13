import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { requireAuth } from './middleware/auth.js';
import dashboard from './routes/dashboard.js';
import resources from './routes/resources.js';
import catalog from './routes/catalog.js';
import transactions from './routes/transactions.js';
import reports from './routes/reports.js';
const app=express();app.use(cors({origin:(process.env.FRONTEND_ORIGIN||'http://localhost:5173').split(',')}));app.use(express.json({limit:'1mb'}));app.get('/api/health',(_req,res)=>res.json({status:'ok'}));app.use('/api',requireAuth,dashboard,reports,catalog,transactions,resources);app.use((err,_req,res,_next)=>{if(err.type==='entity.parse.failed')return res.status(400).json({error:'Request body must contain valid JSON'});if(err.type==='entity.too.large')return res.status(413).json({error:'Request body is too large'});console.error('Unhandled API error:',err);res.status(500).json({error:'Internal server error'});});
if(process.env.VERCEL!=='1'){const port=process.env.PORT||4000;app.listen(port,()=>console.log(`SuperMart API listening on ${port}`));}
export default app;
