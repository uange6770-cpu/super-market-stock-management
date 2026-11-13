import React, { useEffect, useState } from 'react';
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowDownToLine, ArrowRight, ArrowUpFromLine, BarChart3, Boxes, CalendarDays, ChevronDown, CircleDollarSign, LayoutDashboard, LogOut, Menu, Package, Plus, Search, Settings, ShoppingBag, ShoppingCart, Tags, Truck, Users, X, Zap } from 'lucide-react';
import { useAuth } from './context/AuthContext.jsx';
import { request } from './services/api.js';
import Workspace from './components/Workspace.jsx';

const nav = [['Dashboard', '/', LayoutDashboard], ['Products', '/products', Package], ['Categories', '/categories', Tags], ['Suppliers', '/suppliers', Truck], ['Stock Management', '/stock', Boxes], ['Purchases', '/purchases', ShoppingBag], ['Sales', '/sales', ShoppingCart], ['Reports', '/reports', BarChart3], ['Users', '/users', Users], ['Settings', '/settings', Settings]];
const currency = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n || 0));
function Login() {
  const { signIn, signUp, configured } = useAuth();
  const [mode, setMode] = useState('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const isSignup = mode === 'signup';

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const result = isSignup
        ? await signUp(email, password, fullName)
        : await signIn(email, password);
      if (result.error) {
        const detail = result.error.message || 'Authentication failed.';
        setError(detail.toLowerCase().includes('email rate limit exceeded')
          ? 'Supabase has reached its built-in email sending limit. Turn off Confirm Email for local testing or configure custom SMTP.'
          : detail);
        return;
      }
      if (isSignup && !result.data.session) {
        setMessage('Account created. Check your email to confirm your account, then sign in.');
      }
    } catch (error) {
      setError(error.message || 'Could not connect to Supabase. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="login-wrap"><form className="login-card" onSubmit={handleSubmit}>
    <div className="brand-mark"><ShoppingCart/></div>
    <h1>{isSignup ? 'Create your account' : 'Welcome back'}</h1>
    <p>{isSignup ? 'Register to access your supermarket workspace' : 'Sign in to manage your supermarket'}</p>
    {!configured&&<div className="notice">Configure Supabase credentials in <code>frontend/.env</code> to enable authentication.</div>}
    {isSignup&&<label>Full name<input required autoComplete="name" value={fullName} onChange={e=>setFullName(e.target.value)}/></label>}
    <label>Email<input required autoComplete="email" type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
    <label>Password<input required autoComplete={isSignup?'new-password':'current-password'} minLength={6} type="password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
    {error&&<div className="error">{error}</div>}{message&&<div className="notice">{message}</div>}
    <button className="primary wide" disabled={!configured||busy}>{busy ? 'Working…' : isSignup ? 'Create account' : 'Sign in'}</button>
    <button className="auth-switch" type="button" onClick={()=>{setMode(isSignup?'signin':'signup');setError('');setMessage('')}}>
      {isSignup ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
    </button>
  </form></div>;
}
function App() { const {session,ready,signOut}=useAuth(); const [mobile,setMobile]=useState(false),[globalSearch,setGlobalSearch]=useState(''),[role,setRole]=useState('staff'),[apiStatus,setApiStatus]=useState('checking');const navigate=useNavigate();const token=session?.access_token;useEffect(()=>{let active=true;const check=()=>request('/health').then(()=>{if(active)setApiStatus('online')}).catch(()=>{if(active)setApiStatus('offline')});check();const timer=setInterval(check,30000);return()=>{active=false;clearInterval(timer)}},[]);useEffect(()=>{if(token)request('/me',{token}).then(d=>setRole(d.item?.role||'staff')).catch(()=>setRole('staff'))},[token]);if(!ready)return <div className="loading">Loading SuperMart…</div>; if(!session)return <Login/>; return <div className="shell"><aside className={`sidebar ${mobile?'open':''}`}><div className="brand"><ShoppingCart className="brand-icon"/><span><b>SuperMart</b><small>Stock Manager</small></span><button className="close-menu" onClick={()=>setMobile(false)}><X/></button></div><nav>{nav.filter(([label])=>role==="admin"||label!=="Users").map(([label,path,Icon])=><NavLink key={path} to={path} onClick={()=>setMobile(false)} className={({isActive})=>`nav-item ${isActive?'active':''}`}><Icon size={19}/><span>{label}</span></NavLink>)}</nav><button className="nav-item logout" onClick={signOut}><LogOut size={19}/>Logout</button></aside>{mobile&&<div className="scrim" onClick={()=>setMobile(false)}/>}<main className="main"><header className="topbar"><button className="menu-btn" onClick={()=>setMobile(true)}><Menu/></button><form className="search" onSubmit={e=>{e.preventDefault();navigate(`/products?search=${encodeURIComponent(globalSearch)}`);setMobile(false)}}><Search size={19}/><input value={globalSearch} onChange={e=>setGlobalSearch(e.target.value)} placeholder="Search products, barcode…" aria-label="Search products or barcode"/></form><div className="account"><div className="avatar">{session.user.email?.slice(0,2).toUpperCase()}</div><div className="user-label"><b>{session.user.email}</b><small>{role==='admin'?'Admin':'Staff'}</small></div><ChevronDown size={17}/></div></header><Routes><Route path="/" element={<Dashboard token={token} isAdmin={role==='admin'}/>}/>{nav.slice(1).map(([label,path])=><Route key={path} path={path} element={<Workspace title={label} token={token} isAdmin={role==='admin'}/>}/>)}</Routes><footer><span>SuperMart © {new Date().getFullYear()}. All rights reserved.</span><span className="online" data-status={apiStatus}><i/>{apiStatus==='checking'?'Checking API':apiStatus==='online'?'API online':'API unavailable'} <b>v1.0.0</b></span></footer></main></div> }

function Dashboard({token,isAdmin}) { const [data,setData]=useState(null),[error,setError]=useState(''),[period,setPeriod]=useState('7D'); useEffect(()=>{request(`/dashboard?days=${period==='30D'?30:period==='90D'?90:7}`,{token}).then(setData).catch(e=>setError(e.message))},[token,period]); const summary=data?.summary||{}; const cards=[['Total Products',summary.total_products,'blue',Package],['Total Categories',summary.total_categories,'green',Tags],['Total Stock Qty',summary.total_stock_quantity,'amber',Boxes],['Sales Today',summary.sales_today,'purple',ShoppingCart],['Revenue Today',currency(summary.revenue_today),'mint',CircleDollarSign]]; return <div className="content"><div className="page-heading"><div><h1><BarChart3 className="heading-icon"/>Dashboard</h1><p>Welcome back! Here's what's happening in your supermarket today.</p></div><div className="date-btn"><CalendarDays size={18}/>{new Intl.DateTimeFormat("en-ZA",{dateStyle:"medium"}).format(new Date())}</div></div>{error&&<div className="notice error-notice">Could not load live dashboard data: {error}. Check your API and Supabase configuration.</div>}<section className="stats">{cards.map(([label,value,color,Icon])=><article className={`stat ${color}`} key={label}><div className="stat-icon"><Icon size={27}/></div><div><span>{label}</span><strong>{value==null?'-':Number.isFinite(value)?Number(value).toLocaleString():value}</strong><small>Live database data</small></div></article>)}</section><section className="mid-grid"><article className="panel performance"><div className="panel-head"><h2><BarChart3/>Sales Performance</h2><div className="period">{['7D','30D','90D'].map(p=><button className={period===p?'selected':''} key={p} onClick={()=>setPeriod(p)}>{p}</button>)}</div></div><SalesChart rows={data?.sales_performance||[]}/></article><article className="panel low-stock"><div className="panel-head"><h2><AlertTriangle className="red-icon"/>Low Stock Alert</h2><NavLink to="/products">View All <ArrowRight size={16}/></NavLink></div><p className="low-stock-note"><strong>Note:</strong> Products appear here when stock reaches or falls below the alert level set in Products.</p>{(data?.low_stock||[]).length?data.low_stock.slice(0,4).map(p=><div className="low-row" key={p.id}><div className="product-box"><Package/></div><div><b>{p.name}</b><small>Only {p.quantity} {p.unit||'left'}</small></div></div>):<div className="empty">{error?'Unavailable':'No low-stock products'}</div>}</article></section><section className="bottom-grid"><DataPanel title="Recent Sales" icon={ShoppingCart} headers={['Sale #','Date & Time','Items','Total']} rows={(data?.recent_sales||[]).map(s=>[s.sale_number,new Date(s.created_at).toLocaleString(),s.item_count,currency(s.total_amount)])}/><DataPanel title="Recent Stock Movements" icon={Package} headers={['Date','Product','Type','Quantity']} rows={(data?.recent_movements||[]).map(m=>[new Date(m.created_at).toLocaleString(),m.product_name,m.movement_type,m.quantity])}/><article className="panel quick"><div className="panel-head"><h2><Zap/>Quick Actions</h2></div>{isAdmin&&<NavLink to="/products" className="action blue-action"><Plus/>Add Product</NavLink>}<NavLink to="/sales" className="action green-action"><ShoppingCart/>Record Sale</NavLink>{isAdmin&&<NavLink to="/purchases" className="action amber-action"><ArrowDownToLine/>Stock In</NavLink>}{isAdmin&&<NavLink to="/stock" className="action purple-action"><ArrowUpFromLine/>Stock Out</NavLink>}<NavLink to="/reports" className="action gray-action"><BarChart3/>View Reports</NavLink></article></section></div> }
function SalesChart({rows}) { const max=Math.max(1,...rows.map(x=>Number(x.revenue||0))); return <div className="chart-wrap">{rows.length?<div className="bars">{rows.map((r,i)=><div className="bar-col" key={r.day||i}><div className="bar" title={`${r.day}: ${currency(r.revenue)}`} style={{height:`${Math.max(4,Number(r.revenue)/max*100)}%`}}/><small>{r.label||r.day}</small></div>)}</div>:<div className="empty">Sales performance will appear when sales are recorded.</div>}</div> }
function DataPanel({title,icon:Icon,headers,rows}) { const to=title==='Recent Sales'?'/sales':'/stock'; return <article className="panel data-panel"><div className="panel-head"><h2><Icon/>{title}</h2><NavLink className="panel-link" to={to}>View All <ArrowRight size={16}/></NavLink></div><div className="table-scroll"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.length?rows.slice(0,5).map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell||'-'}</td>)}</tr>):<tr><td colSpan={headers.length} className="empty-cell">No records yet</td></tr>}</tbody></table></div></article> }
export default App;
