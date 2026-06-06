import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import {
  ChefHat, QrCode, ClipboardList,
  RefreshCw, Download, Radio, Bell, TrendingUp, Users,
  Clock, CheckCircle, Zap, Eye, Printer, Send, MoreVertical, Activity
} from 'lucide-react';

const STATUS_COLORS = {
  'New Order':  { bg: 'bg-blue-50',   text: 'text-blue-600',   dot: 'bg-blue-500',   pulse: true  },
  'Accepted':   { bg: 'bg-indigo-50', text: 'text-indigo-600', dot: 'bg-indigo-500', pulse: false },
  'Preparing':  { bg: 'bg-amber-50',  text: 'text-amber-600',  dot: 'bg-amber-500',  pulse: true  },
  'Ready':      { bg: 'bg-emerald-50',text: 'text-emerald-600',dot: 'bg-emerald-500',pulse: true  },
  'Served':     { bg: 'bg-teal-50',   text: 'text-teal-600',   dot: 'bg-teal-500',  pulse: false },
  'Completed':  { bg: 'bg-slate-100',  text: 'text-slate-600',  dot: 'bg-slate-500', pulse: false },
  'Cancelled':  { bg: 'bg-red-50',    text: 'text-red-600',    dot: 'bg-red-500',   pulse: false },
};

export default function LiveOrderTracking() {
  const { restaurant } = useContext(AuthContext);
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [activity, setActivity] = useState([]);
  const [stats, setStats] = useState([
    { label:'Total Orders', value:'0', icon:ClipboardList,       change:'Live', up:true,  color:'from-violet-600 to-indigo-600' },
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
        { label:'Total Orders', value: String(totalOrders), icon: ClipboardList,       change:'Live', up:true,  color:'from-[#6C4DFF] to-indigo-600' },
        { label:'Active Tables',   value: String(activeTablesCount),  icon: Users,        change:'Live',   up:true,  color:'from-blue-500 to-cyan-500'    },
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
          color: 'text-blue-500',
          timestamp: new Date(o.createdAt).getTime()
        });
        if (o.status !== 'New Order') {
          let icon = '🔄';
          let color = 'text-indigo-500';
          if (o.status === 'Preparing') { icon = '🔥'; color = 'text-amber-500'; }
          else if (o.status === 'Ready') { icon = '🛎️'; color = 'text-emerald-500'; }
          else if (o.status === 'Served' || o.status === 'Completed') { icon = '🚀'; color = 'text-teal-500'; }
          else if (o.status === 'Cancelled') { icon = '❌'; color = 'text-red-500'; }
          
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#f8f9fa]">

      {/* Header */}
      <header className="py-5 px-6 md:h-20 bg-white/80 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur-md shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50" />
              <span className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Live</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Live Order Tracking</h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Monitor all customer orders in real time</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="flex items-center justify-center flex-1 md:flex-none gap-2 px-4 py-2 bg-indigo-50 text-[#6C4DFF] border border-indigo-100 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition-all">
            <Radio size={14} className="animate-pulse" />Live Orders
          </button>
          <button className="flex items-center justify-center flex-1 md:flex-none gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm">
            <Download size={14} />Export
          </button>
          <button onClick={() => showToast('Data refreshed!')} className="flex items-center justify-center flex-1 md:flex-none gap-2 px-4 py-2 bg-[#6C4DFF] text-white rounded-xl text-sm font-bold shadow-md hover:bg-indigo-600 transition-all">
            <RefreshCw size={14} />Refresh
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.07 }}
              className="relative bg-white border border-slate-200 shadow-sm rounded-2xl p-5 overflow-hidden group hover:border-indigo-200 transition-all duration-300 cursor-default hover:shadow-md">
              <div className={`absolute inset-0 bg-gradient-to-br ${s.color} opacity-0 group-hover:opacity-5 transition-opacity rounded-2xl`} />
              <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${s.color} mb-3 shadow-sm`}>
                <s.icon size={18} className="text-white" />
              </div>
              <div className="text-3xl font-black text-slate-900 mb-1">{s.value}</div>
              <div className="text-xs text-slate-500 font-semibold mb-2">{s.label}</div>
              <div className={`text-xs font-bold ${s.up === null ? 'text-blue-500' : s.up ? 'text-emerald-500' : 'text-red-500'}`}>
                {s.up === true ? '↑' : s.up === false ? '↓' : '●'} {s.change}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Chart + Top Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-1 lg:col-span-2 bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-slate-900 font-bold">Orders Per Hour</h3>
                <p className="text-slate-500 text-xs">Today's order volume trend</p>
              </div>
              <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                <TrendingUp size={14} />+28% vs yesterday
              </div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6C4DFF" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6C4DFF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:8, color:'#0f172a', fontSize:12, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="orders" stroke="#6C4DFF" strokeWidth={2.5} fill="url(#ordGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
            <h3 className="text-slate-900 font-bold mb-1">Most Active Tables</h3>
            <p className="text-slate-500 text-xs mb-5">By orders today</p>
            <div className="space-y-4">
              {topTables.map((t, i) => (
                <div key={t.table}>
                  <div className="flex justify-between text-xs font-semibold mb-1.5">
                    <span className="text-slate-700">{t.table}</span>
                    <span className="text-indigo-600">{t.orders} orders</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div initial={{ width:0 }} animate={{ width:`${t.pct}%` }} transition={{ delay: i*0.1+0.3, duration:0.6 }}
                      className="h-full bg-gradient-to-r from-indigo-500 to-[#6C4DFF] rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Table + Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Orders Table */}
          <div className="col-span-1 lg:col-span-2 bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <h3 className="text-slate-900 font-bold">Live Orders</h3>
                <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold rounded-full">{orders.length} total</span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {STATUSES.map(s => (
                  <button key={s} onClick={() => setFilter(s)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${filter===s ? 'bg-[#6C4DFF] text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider bg-slate-50/50">
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
                          className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 text-indigo-600 font-bold text-sm whitespace-nowrap">{order.orderId}</td>
                          <td className="px-4 py-3 text-slate-900 font-semibold text-sm whitespace-nowrap">{order.table}</td>
                          <td className="px-4 py-3 text-slate-600 text-xs max-w-[160px] truncate">{order.items}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{order.time}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${order.payment==='Paid' ? 'bg-emerald-50 border border-emerald-100 text-emerald-600' : 'bg-amber-50 border border-amber-100 text-amber-600'}`}>
                              {order.payment}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border w-fit ${sc.bg} border-[color:currentColor] border-opacity-20`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} ${sc.pulse ? 'animate-pulse' : ''}`} />
                              <span className={`text-[10px] font-bold ${sc.text}`}>{order.status}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs font-semibold whitespace-nowrap">{order.eta}</td>
                          <td className="px-4 py-3 text-slate-900 font-bold text-sm whitespace-nowrap">{order.amount}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex gap-1">
                              <button onClick={() => updateStatus(order.id, 'Preparing')} title="Mark Preparing" className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"><Zap size={14}/></button>
                              <button onClick={() => updateStatus(order.id, 'Ready')} title="Mark Ready" className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"><CheckCircle size={14}/></button>
                              <button title="Print Bill" className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Printer size={14}/></button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
              {filteredOrders.length === 0 && (
                <div className="py-12 text-center text-slate-400 font-semibold">No orders for this status</div>
              )}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-[#6C4DFF]" />
                <h3 className="text-slate-900 font-bold">Live Activity</h3>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="flex-1 p-4 space-y-2 overflow-y-auto max-h-[480px]">
              <AnimatePresence>
                {activity.map((a, i) => {
                  let colorClass = 'text-slate-700';
                  if (a.color.includes('emerald')) colorClass = 'text-emerald-700';
                  if (a.color.includes('amber')) colorClass = 'text-amber-700';
                  if (a.color.includes('red')) colorClass = 'text-red-700';
                  if (a.color.includes('blue')) colorClass = 'text-blue-700';
                  if (a.color.includes('violet')) colorClass = 'text-indigo-700';

                  return (
                    <motion.div key={i} initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} transition={{ delay: i*0.04 }}
                      className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-100 hover:border-slate-200 shadow-sm hover:shadow transition-all">
                      <span className="text-base">{a.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold ${colorClass} leading-snug`}>{a.text}</p>
                        <p className="text-[10px] font-medium text-slate-400 mt-1">{a.time}</p>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
            <div className="px-4 pb-4 bg-slate-50/50 pt-4 border-t border-slate-100">
              <button className="w-full py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 hover:text-slate-900 shadow-sm transition-all">
                View Full Activity Log
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5">
          <h3 className="text-slate-900 font-bold mb-4 text-sm">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            {[
              { label:'Assign Waiter', icon:Users, color:'from-blue-600 to-cyan-600' },
              { label:'Print All Bills', icon:Printer, color:'from-slate-600 to-slate-500' },
              { label:'Mark All Ready', icon:CheckCircle, color:'from-emerald-600 to-teal-600' },
              { label:'Send Notifications', icon:Bell, color:'from-amber-500 to-orange-500' },
              { label:'View Analytics', icon:TrendingUp, color:'from-[#6C4DFF] to-indigo-600' },
            ].map(a => (
              <button key={a.label} onClick={() => showToast(`${a.label} triggered`)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:border-indigo-200 hover:shadow-md transition-all group">
                <div className={`p-1.5 rounded-lg bg-gradient-to-br ${a.color} shadow-sm`}>
                  <a.icon size={14} className="text-white" />
                </div>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity:0, y:60 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:60 }}
            className="fixed bottom-6 right-6 bg-white border border-slate-200 text-slate-800 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 z-50 text-sm font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-[#6C4DFF] animate-pulse" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
