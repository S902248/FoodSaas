import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import {
  ChefHat, LayoutDashboard, UtensilsCrossed, ClipboardList, QrCode,
  LogOut, RefreshCw, Download, Radio, Bell, TrendingUp, Users,
  Clock, CheckCircle, Zap, Eye, Printer, Send, MoreVertical, Activity
} from 'lucide-react';

const STATUS_COLORS = {
  'New Order':  { bg: 'bg-blue-500/15',   text: 'text-blue-400',   dot: 'bg-blue-400',   pulse: true  },
  'Accepted':   { bg: 'bg-indigo-500/15', text: 'text-indigo-400', dot: 'bg-indigo-400', pulse: false },
  'Preparing':  { bg: 'bg-amber-500/15',  text: 'text-amber-400',  dot: 'bg-amber-400',  pulse: true  },
  'Ready':      { bg: 'bg-emerald-500/15',text: 'text-emerald-400',dot: 'bg-emerald-400',pulse: true  },
  'Served':     { bg: 'bg-teal-500/15',   text: 'text-teal-400',   dot: 'bg-teal-400',  pulse: false },
  'Completed':  { bg: 'bg-slate-500/15',  text: 'text-slate-400',  dot: 'bg-slate-400', pulse: false },
  'Cancelled':  { bg: 'bg-red-500/15',    text: 'text-red-400',    dot: 'bg-red-400',   pulse: false },
};

export default function LiveOrderTracking() {
  const { restaurant, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [activity, setActivity] = useState([]);
  const [stats, setStats] = useState([
    { label:'Total QR Orders', value:'0', icon:QrCode,       change:'Live', up:true,  color:'from-violet-600 to-indigo-600' },
    { label:'Active Tables',   value:'0',  icon:Users,        change:'Live',   up:true,  color:'from-blue-600 to-cyan-600'    },
    { label:'In Kitchen',      value:'0',  icon:ChefHat,      change:'Live', up:null,  color:'from-amber-500 to-orange-500' },
    { label:'Completed',       value:'0', icon:CheckCircle,  change:'Live',  up:true,  color:'from-emerald-500 to-teal-500' },
    { label:'Avg Prep Time',   value:'0m',icon:Clock,        change:'Live',  up:true,  color:'from-pink-500 to-rose-500'   },
  ]);
  const [chartData, setChartData] = useState([
    {t:'12pm',orders:0},{t:'1pm',orders:0},{t:'2pm',orders:0},{t:'3pm',orders:0},
    {t:'4pm',orders:0},{t:'5pm',orders:0},{t:'6pm',orders:0},{t:'7pm',orders:0},
    {t:'8pm',orders:0},{t:'9pm',orders:0},{t:'10pm',orders:0}
  ]);
  const [topTables, setTopTables] = useState([]);
  const [ticker, setTicker] = useState(0);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState('All');

  const STATUSES = ['All','New Order','Accepted','Preparing','Ready','Served','Completed','Cancelled'];

  const fetchOrders = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/orders');
      
      const mappedOrders = res.data.map(o => ({
        id: o._id,
        orderId: o.orderId,
        table: o.tableName,
        customer: o.customerName,
        items: o.items.map(item => `${item.name}${item.quantity > 1 ? ` x${item.quantity}` : ''}`).join(', '),
        time: new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        payment: o.paymentStatus,
        status: o.status,
        eta: o.eta,
        amount: `₹${o.totalAmount}`
      }));
      setOrders(mappedOrders);

      // Compute stats
      const totalOrders = res.data.length;
      const activeTablesSet = new Set(
        res.data
          .filter(o => !['Completed', 'Cancelled', 'Served'].includes(o.status))
          .map(o => o.tableName)
      );
      const activeTablesCount = activeTablesSet.size;
      const inKitchenCount = res.data.filter(o => ['Accepted', 'Preparing'].includes(o.status)).length;
      const completedCount = res.data.filter(o => ['Served', 'Completed'].includes(o.status)).length;

      setStats([
        { label:'Total QR Orders', value: String(totalOrders), icon: QrCode,       change:'Live', up:true,  color:'from-violet-600 to-indigo-600' },
        { label:'Active Tables',   value: String(activeTablesCount),  icon: Users,        change:'Live',   up:true,  color:'from-blue-600 to-cyan-600'    },
        { label:'In Kitchen',      value: String(inKitchenCount),  icon: ChefHat,      change:'Live', up:null,  color:'from-amber-500 to-orange-500' },
        { label:'Completed',       value: String(completedCount), icon: CheckCircle,  change:'Live',  up:true,  color:'from-emerald-500 to-teal-500' },
        { label:'Avg Prep Time',   value: totalOrders > 0 ? '12m' : '0m', icon: Clock,        change:'Live',  up:true,  color:'from-pink-500 to-rose-500'   },
      ]);

      // Compute hourly chart data
      const hours = ['12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm', '9pm', '10pm'];
      const hourCounts = {};
      hours.forEach(h => { hourCounts[h] = 0; });
      res.data.forEach(o => {
        const date = new Date(o.createdAt);
        let hr = date.getHours();
        let ampm = hr >= 12 ? 'pm' : 'am';
        hr = hr % 12;
        hr = hr ? hr : 12;
        const hrStr = `${hr}${ampm}`;
        if (hrStr in hourCounts) {
          hourCounts[hrStr] += 1;
        }
      });
      setChartData(hours.map(h => ({ t: h, orders: hourCounts[h] })));

      // Compute top tables
      const tableCounts = {};
      res.data.forEach(o => {
        tableCounts[o.tableName] = (tableCounts[o.tableName] || 0) + 1;
      });
      const sortedTables = Object.keys(tableCounts)
        .map(table => ({ table, orders: tableCounts[table] }))
        .sort((a, b) => b.orders - a.orders)
        .slice(0, 5);
      const maxOrders = sortedTables.length > 0 ? sortedTables[0].orders : 1;
      setTopTables(sortedTables.map(t => ({
        ...t,
        pct: Math.round((t.orders / maxOrders) * 100)
      })));

      // Compute activity feed
      const newActivity = [];
      res.data.slice(0, 10).forEach(o => {
        const orderTime = new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        newActivity.push({
          icon: '📲',
          text: `${o.tableName} placed order ${o.orderId}`,
          time: orderTime,
          color: 'text-blue-400',
          timestamp: new Date(o.createdAt).getTime()
        });
        if (o.status !== 'New Order') {
          let icon = '🔄';
          let color = 'text-violet-400';
          if (o.status === 'Preparing') { icon = '🔥'; color = 'text-amber-400'; }
          else if (o.status === 'Ready') { icon = '🛎️'; color = 'text-emerald-400'; }
          else if (o.status === 'Served' || o.status === 'Completed') { icon = '🚀'; color = 'text-teal-400'; }
          else if (o.status === 'Cancelled') { icon = '❌'; color = 'text-red-400'; }
          
          newActivity.push({
            icon,
            text: `Order ${o.orderId} is ${o.status.toLowerCase()}`,
            time: new Date(o.updatedAt || o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
            color,
            timestamp: new Date(o.updatedAt || o.createdAt).getTime()
          });
        }
      });
      newActivity.sort((a, b) => b.timestamp - a.timestamp);
      setActivity(newActivity.slice(0, 8));

    } catch (err) {
      console.error("Error fetching orders:", err);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await axios.put(`http://localhost:5000/api/orders/${id}/status`, { status: newStatus });
      const order = orders.find(o => o.id === id);
      const displayId = order ? order.orderId : id;
      showToast(`Order ${displayId} → ${newStatus}`);
      fetchOrders();
    } catch (err) {
      console.error("Error updating order status:", err);
      showToast(`Failed to update order status`);
    }
  };

  const filteredOrders = filter === 'All' ? orders : orders.filter(o => o.status === filter);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen flex bg-[#0F172A] font-sans">

      {/* Sidebar */}
      <aside className="w-64 bg-[#0B1120] text-slate-300 flex flex-col justify-between border-r border-slate-800/60 z-30 shrink-0">
        <div>
          <div className="p-6 flex items-center gap-3 border-b border-slate-800/50">
            <div className="p-2 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl shadow-lg shadow-indigo-500/30">
              <ChefHat size={22} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white">FoodaaS</span>
          </div>
          <nav className="px-4 py-5 space-y-1">
            {[
              { to:'/dashboard', icon:LayoutDashboard, label:'Dashboard' },
              { to:'/dashboard/menu', icon:UtensilsCrossed, label:'Menu' },
              { to:'/dashboard/orders', icon:ClipboardList, label:'Live Orders', active:true },
              { to:'/dashboard/qr-codes', icon:QrCode, label:'QR Codes' },
            ].map(item => (
              <Link key={item.to} to={item.to}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm font-semibold
                  ${item.active
                    ? 'bg-gradient-to-r from-violet-600/90 to-indigo-600/90 text-white shadow-lg shadow-indigo-500/20'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>
                <item.icon size={18} />
                {item.label}
                {item.active && <span className="ml-auto w-2 h-2 rounded-full bg-white animate-pulse" />}
              </Link>
            ))}
          </nav>
        </div>
        <div className="p-4 border-t border-slate-800/50 space-y-3">
          <div className="flex items-center gap-3 px-3 py-2 bg-slate-800/30 rounded-xl">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-indigo-400 flex items-center justify-center text-white font-bold text-sm">
              {restaurant?.restaurantName?.charAt(0) || 'R'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{restaurant?.restaurantName || 'Restaurant'}</p>
              <p className="text-xs text-slate-500">Store Owner</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2.5 w-full rounded-xl hover:bg-red-500/10 hover:text-red-400 text-slate-400 transition-all text-sm font-semibold">
            <LogOut size={18} /><span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="h-20 bg-[#0B1120]/80 border-b border-slate-800/60 flex items-center justify-between px-8 backdrop-blur-md shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50" />
                <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Live</span>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Live QR Order Tracking</h1>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Monitor all customer orders placed via table QR codes in real time</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-violet-600/20 border border-violet-500/30 text-violet-300 rounded-xl text-sm font-semibold hover:bg-violet-600/30 transition-all">
              <Radio size={14} className="animate-pulse" />Live Orders
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-800/60 border border-slate-700/50 text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-700/60 transition-all">
              <Download size={14} />Export
            </button>
            <button onClick={() => showToast('Data refreshed!')} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all">
              <RefreshCw size={14} />Refresh
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Stats */}
          <div className="grid grid-cols-5 gap-4">
            {stats.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.07 }}
                className="relative bg-[#131C2E] border border-slate-800/60 rounded-2xl p-5 overflow-hidden group hover:border-slate-700 transition-all duration-300 cursor-default">
                <div className={`absolute inset-0 bg-gradient-to-br ${s.color} opacity-0 group-hover:opacity-5 transition-opacity rounded-2xl`} />
                <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${s.color} mb-3 shadow-lg`}>
                  <s.icon size={18} className="text-white" />
                </div>
                <div className="text-3xl font-black text-white mb-1">{s.value}</div>
                <div className="text-xs text-slate-500 font-semibold mb-2">{s.label}</div>
                <div className={`text-xs font-bold ${s.up === null ? 'text-blue-400' : s.up ? 'text-emerald-400' : 'text-red-400'}`}>
                  {s.up === true ? '↑' : s.up === false ? '↓' : '●'} {s.change}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Chart + Top Tables */}
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 bg-[#131C2E] border border-slate-800/60 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-white font-bold">QR Orders Per Hour</h3>
                  <p className="text-slate-500 text-xs">Today's order volume trend</p>
                </div>
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                  <TrendingUp size={14} />+28% vs yesterday
                </div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#7C3AED" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="t" tick={{ fill:'#475569', fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:'#475569', fontSize:11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background:'#1E293B', border:'1px solid #334155', borderRadius:8, color:'#fff', fontSize:12 }} />
                  <Area type="monotone" dataKey="orders" stroke="#7C3AED" strokeWidth={2.5} fill="url(#ordGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-[#131C2E] border border-slate-800/60 rounded-2xl p-6">
              <h3 className="text-white font-bold mb-1">Most Active Tables</h3>
              <p className="text-slate-500 text-xs mb-5">By QR scan orders today</p>
              <div className="space-y-4">
                {topTables.map((t, i) => (
                  <div key={t.table}>
                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                      <span className="text-slate-300">{t.table}</span>
                      <span className="text-violet-400">{t.orders} orders</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div initial={{ width:0 }} animate={{ width:`${t.pct}%` }} transition={{ delay: i*0.1+0.3, duration:0.6 }}
                        className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Table + Activity Feed */}
          <div className="grid grid-cols-3 gap-6">

            {/* Orders Table */}
            <div className="col-span-2 bg-[#131C2E] border border-slate-800/60 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-white font-bold">Live Orders</h3>
                  <span className="px-2 py-0.5 bg-violet-600/20 border border-violet-500/30 text-violet-300 text-xs font-bold rounded-full">{orders.length} total</span>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {STATUSES.map(s => (
                    <button key={s} onClick={() => setFilter(s)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${filter===s ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-800/60 text-slate-500 text-xs uppercase tracking-wider">
                      {['Order','Table','Items','Time','Payment','Status','ETA','Amount','Actions'].map(h => (
                        <th key={h} className="px-4 py-3 font-semibold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {filteredOrders.map((order, i) => {
                        const sc = STATUS_COLORS[order.status];
                        return (
                          <motion.tr key={order.id} initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ delay: i*0.04 }}
                            className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors">
                            <td className="px-4 py-3 text-violet-400 font-bold text-sm whitespace-nowrap">{order.orderId}</td>
                            <td className="px-4 py-3 text-white font-semibold text-sm whitespace-nowrap">{order.table}</td>
                            <td className="px-4 py-3 text-slate-400 text-xs max-w-[160px] truncate">{order.items}</td>
                            <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{order.time}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${order.payment==='Paid' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                                {order.payment}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full w-fit ${sc.bg}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} ${sc.pulse ? 'animate-pulse' : ''}`} />
                                <span className={`text-xs font-bold ${sc.text}`}>{order.status}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-400 text-xs font-semibold whitespace-nowrap">{order.eta}</td>
                            <td className="px-4 py-3 text-white font-bold text-sm whitespace-nowrap">{order.amount}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex gap-1">
                                <button onClick={() => updateStatus(order.id, 'Preparing')} title="Mark Preparing" className="p-1.5 text-slate-500 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors"><Zap size={13}/></button>
                                <button onClick={() => updateStatus(order.id, 'Ready')} title="Mark Ready" className="p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors"><CheckCircle size={13}/></button>
                                <button title="Print Bill" className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"><Printer size={13}/></button>
                                <button title="Notify" className="p-1.5 text-slate-500 hover:text-violet-400 hover:bg-violet-400/10 rounded-lg transition-colors"><Send size={13}/></button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
                {filteredOrders.length === 0 && (
                  <div className="py-12 text-center text-slate-600 font-semibold">No orders for this status</div>
                )}
              </div>
            </div>

            {/* Activity Feed */}
            <div className="bg-[#131C2E] border border-slate-800/60 rounded-2xl overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-slate-800/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-violet-400" />
                  <h3 className="text-white font-bold">Live Activity</h3>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="flex-1 p-4 space-y-2 overflow-y-auto max-h-[480px]">
                <AnimatePresence>
                  {activity.map((a, i) => (
                    <motion.div key={i} initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} transition={{ delay: i*0.04 }}
                      className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-xl border border-slate-800/40 hover:border-slate-700/60 transition-colors">
                      <span className="text-base">{a.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold ${a.color} leading-snug`}>{a.text}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{a.time}</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              <div className="px-4 pb-4">
                <button className="w-full py-2.5 bg-violet-600/10 border border-violet-500/20 text-violet-400 rounded-xl text-xs font-bold hover:bg-violet-600/20 transition-all">
                  View Full Activity Log
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-[#131C2E] border border-slate-800/60 rounded-2xl p-5">
            <h3 className="text-white font-bold mb-4 text-sm">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              {[
                { label:'Assign Waiter', icon:Users, color:'from-blue-600 to-cyan-600' },
                { label:'Print All Bills', icon:Printer, color:'from-slate-600 to-slate-500' },
                { label:'Mark All Ready', icon:CheckCircle, color:'from-emerald-600 to-teal-600' },
                { label:'Send Notifications', icon:Bell, color:'from-amber-500 to-orange-500' },
                { label:'View Analytics', icon:TrendingUp, color:'from-violet-600 to-indigo-600' },
                { label:'Generate QR Again', icon:QrCode, color:'from-pink-600 to-rose-600' },
              ].map(a => (
                <button key={a.label} onClick={() => showToast(`${a.label} triggered`)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 text-slate-300 rounded-xl text-sm font-semibold hover:border-slate-600 hover:bg-slate-800 transition-all group">
                  <div className={`p-1 rounded-lg bg-gradient-to-br ${a.color}`}>
                    <a.icon size={12} className="text-white" />
                  </div>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity:0, y:60 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:60 }}
            className="fixed bottom-6 right-6 bg-slate-900 border border-violet-500/40 text-white px-5 py-3 rounded-2xl shadow-2xl shadow-indigo-500/20 flex items-center gap-3 z-50 text-sm font-semibold">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
