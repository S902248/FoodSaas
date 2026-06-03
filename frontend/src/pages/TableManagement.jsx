import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Clock, 
  ListOrdered, 
  UserCircle,
  TrendingUp,
  Armchair,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const TableManagement = () => {
  const { restaurant, loading } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [tables, setTables] = useState([]);
  const [metrics, setMetrics] = useState({
    total: 0,
    available: 0,
    occupied: 0,
    revenueToday: 0
  });

  const fetchData = async () => {
    if (!restaurant) return;
    try {
      const [ordersRes, qrRes] = await Promise.all([
        axios.get('http://localhost:5000/api/orders', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get('http://localhost:5000/api/qrcodes', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      const allOrders = ordersRes.data;
      const qrcodes = qrRes.data.qrcodes || [];

      // Calculate Revenue Today (sum of all completed orders today)
      // Assuming today's orders can be filtered by createdAt
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const revenueToday = allOrders
        .filter(o => o.status === 'Completed' && new Date(o.createdAt) >= today)
        .reduce((sum, o) => sum + o.totalAmount, 0);

      const currentActiveOrders = allOrders.filter(o => !['Completed', 'Cancelled', 'Served'].includes(o.status));

      const buildTables = (qrList) => {
        return qrList.map((qr, idx) => {
          const tableOrders = currentActiveOrders.filter(o => o.tableName === qr.tableName);
          
          let status = "Available";
          let totalBill = 0;
          let itemsCount = 0;
          let timeOccupied = "-";
          
          if (tableOrders.length > 0) {
            // Determine status based on latest order or combined logic
            // For now, if there's any active order, it's Occupied
            status = "Occupied"; 
            
            // Check specific statuses if needed
            const hasPreparing = tableOrders.some(o => o.status === 'Preparing');
            const hasReady = tableOrders.some(o => o.status === 'Ready');
            if (hasPreparing) status = "Preparing";
            else if (hasReady) status = "Served";
            else status = "Ordered";

            totalBill = tableOrders.reduce((sum, o) => sum + o.totalAmount, 0);
            
            tableOrders.forEach(o => {
               o.items.forEach(item => {
                 itemsCount += item.quantity;
               });
            });
            
            const oldestOrder = new Date(Math.min(...tableOrders.map(o => new Date(o.createdAt).getTime())));
            const diffMs = Date.now() - oldestOrder.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const hours = Math.floor(diffMins / 60);
            const mins = diffMins % 60;
            timeOccupied = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
          }

          return {
            id: qr.tableName.replace(/^\D+/g, '') || (idx + 1).toString(),
            tableName: qr.tableName,
            status,
            capacity: qr.capacity || 4,
            itemsCount,
            totalBill,
            timeOccupied
          };
        });
      };

      let tableData = [];
      if (qrcodes.length === 0) {
        const fallbackQRs = Array.from({ length: 12 }, (_, i) => ({ tableName: `Table ${i + 1}` }));
        tableData = buildTables(fallbackQRs);
      } else {
        tableData = buildTables(qrcodes);
      }
      
      setTables(tableData);
      
      // Update Metrics
      setMetrics({
        total: tableData.length,
        available: tableData.filter(t => t.status === 'Available').length,
        occupied: tableData.filter(t => t.status !== 'Available').length,
        revenueToday
      });

    } catch (err) {
      console.error("Error fetching table data:", err);
    }
  };

  useEffect(() => {
    if (!loading && restaurant) {
      fetchData();
      const interval = setInterval(fetchData, 10000); 
      return () => clearInterval(interval);
    }
  }, [loading, restaurant]);

  const handleTableClick = (table) => {
    navigate(`/dashboard/tables/${table.id}`);
  };

  const getStatusConfig = (status) => {
    switch(status) {
      case 'Available': return { bg: 'bg-emerald-500', text: 'text-emerald-700', badge: 'bg-emerald-50 border-emerald-200' };
      case 'Ordered': return { bg: 'bg-yellow-500', text: 'text-yellow-700', badge: 'bg-yellow-50 border-yellow-200' };
      case 'Preparing': return { bg: 'bg-amber-500', text: 'text-amber-700', badge: 'bg-amber-50 border-amber-200' };
      case 'Served': return { bg: 'bg-blue-500', text: 'text-blue-700', badge: 'bg-blue-50 border-blue-200' };
      case 'Payment Pending': return { bg: 'bg-rose-500', text: 'text-rose-700', badge: 'bg-rose-50 border-rose-200' };
      default: return { bg: 'bg-indigo-500', text: 'text-indigo-700', badge: 'bg-indigo-50 border-indigo-200' };
    }
  };

  return (
    <div className="bg-[#f8f9fa] min-h-screen p-8 text-slate-800 font-sans">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Table Dashboard</h1>
          <p className="text-slate-500 mt-1">Manage tables and take orders directly</p>
        </div>
      </header>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#6C4DFF] flex items-center justify-center">
            <Armchair size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Tables</p>
            <p className="text-2xl font-black text-slate-900">{metrics.total}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Available</p>
            <p className="text-2xl font-black text-slate-900">{metrics.available}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Occupied</p>
            <p className="text-2xl font-black text-slate-900">{metrics.occupied}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Revenue Today</p>
            <p className="text-2xl font-black text-emerald-600">₹{metrics.revenueToday.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Table Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {tables.map((table, idx) => {
          const config = getStatusConfig(table.status);
          const isOccupied = table.status !== 'Available';
          
          return (
            <div 
              key={idx} 
              onClick={() => handleTableClick(table)}
              className={`bg-white rounded-3xl border p-5 transition-all duration-300 cursor-pointer group hover:-translate-y-1 hover:shadow-lg
                ${isOccupied ? 'border-indigo-100 shadow-md' : 'border-slate-200 shadow-sm'}
              `}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm
                  ${isOccupied ? 'bg-[#6C4DFF] text-white shadow-indigo-200' : 'bg-slate-100 text-slate-500'}
                `}>
                  {table.id}
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${config.badge}`}>
                  <div className={`w-2 h-2 rounded-full ${config.bg} ${isOccupied ? 'animate-pulse' : ''}`}></div>
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${config.text}`}>
                    {table.status}
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="font-bold text-slate-900 text-lg leading-tight mb-1">{table.tableName}</h4>
                <div className="flex items-center gap-1.5">
                  <UserCircle size={14} className="text-slate-400"/>
                  <span className="text-xs text-slate-500 font-medium">{table.capacity} Seats</span>
                </div>
              </div>
              
              <div className="h-[1px] w-full bg-slate-100 mb-4"></div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1 text-slate-400">
                    <Clock size={12} />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Time</span>
                  </div>
                  <span className={`text-xs font-bold ${isOccupied ? 'text-slate-900' : 'text-slate-300'}`}>
                    {table.timeOccupied}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1 text-slate-400">
                    <ListOrdered size={12} />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Items</span>
                  </div>
                  <span className={`text-xs font-bold ${isOccupied ? 'text-slate-900' : 'text-slate-300'}`}>
                    {isOccupied ? table.itemsCount : '-'}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100 group-hover:border-indigo-100 transition-colors">
                 <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Bill</span>
                 <span className={`text-base font-black tracking-tight ${isOccupied ? 'text-emerald-600' : 'text-slate-300'}`}>
                   ₹{isOccupied ? table.totalBill.toFixed(2) : '0.00'}
                 </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TableManagement;
