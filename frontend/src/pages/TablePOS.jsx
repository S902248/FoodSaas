import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Search, UserCircle, Clock, ListOrdered, 
  ShoppingCart, Plus, Minus, CheckCircle2, ChevronRight, 
  Trash2, Receipt, ChefHat, Bell, Utensils
} from 'lucide-react';

const TablePOS = () => {
  const { id } = useParams(); // table ID or tableName
  const navigate = useNavigate();
  const { restaurant, loading } = useContext(AuthContext);

  const [table, setTable] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [cart, setCart] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [discount, setDiscount] = useState(0);

  // Parse Table Name from ID (assuming ID is like "Table 1" or just "1")
  const tableName = id.toLowerCase().includes('table') ? id : `Table ${id}`;

  const fetchData = async () => {
    if (!restaurant) return;
    try {
      const [ordersRes, qrRes, menuRes] = await Promise.all([
        axios.get('http://localhost:5000/api/orders', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get('http://localhost:5000/api/qrcodes', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get('http://localhost:5000/api/menu')
      ]);

      // Set Menu
      const availableMenu = menuRes.data.filter(item => item.isAvailable);
      setMenuItems(availableMenu);
      const uniqueCategories = [...new Set(availableMenu.map(item => item.category))];
      setCategories(['All', ...uniqueCategories]);

      // Process Orders for this table
      const currentActiveOrders = ordersRes.data.filter(o => 
        !['Completed', 'Cancelled', 'Served'].includes(o.status) && 
        o.tableName.toLowerCase() === tableName.toLowerCase()
      );

      let status = "Available";
      let totalBill = 0;
      let itemsCount = 0;
      let timeOccupied = "-";
      let allOrderedItems = [];

      if (currentActiveOrders.length > 0) {
        status = "Occupied";
        totalBill = currentActiveOrders.reduce((sum, o) => sum + o.totalAmount, 0);
        
        currentActiveOrders.forEach(o => {
           o.items.forEach(item => {
             itemsCount += item.quantity;
             allOrderedItems.push({...item, orderStatus: o.status, orderId: o.orderId});
           });
        });
        
        const oldestOrder = new Date(Math.min(...currentActiveOrders.map(o => new Date(o.createdAt).getTime())));
        const diffMs = Date.now() - oldestOrder.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        timeOccupied = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      }

      setTable({
        tableName,
        status,
        capacity: 4, // Default or fetch from QR if exists
        orders: currentActiveOrders,
        allOrderedItems,
        itemsCount,
        totalBill,
        timeOccupied
      });

    } catch (err) {
      console.error("Error fetching POS data:", err);
    }
  };

  useEffect(() => {
    if (!loading && restaurant) {
      fetchData();
      const interval = setInterval(fetchData, 10000);
      return () => clearInterval(interval);
    }
  }, [loading, restaurant, tableName]);

  // Cart Functions
  const addToCart = (item) => {
    const existingItem = cart.find(cartItem => cartItem._id === item._id);
    if (existingItem) {
      setCart(cart.map(cartItem => 
        cartItem._id === item._id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const removeFromCart = (itemId) => {
    const existingItem = cart.find(item => item._id === itemId);
    if (existingItem.quantity === 1) {
      setCart(cart.filter(item => item._id !== itemId));
    } else {
      setCart(cart.map(item => 
        item._id === itemId ? { ...item, quantity: item.quantity - 1 } : item
      ));
    }
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = cartSubtotal * 0.05; // 5% tax
  const cartTotal = cartSubtotal + tax - discount;

  const handleConfirmOrder = async () => {
    if (cart.length === 0 || !table) return;
    setIsSubmitting(true);
    try {
      const orderItems = cart.map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      }));

      await axios.post('http://localhost:5000/api/orders', {
        restaurantId: restaurant._id || restaurant.id,
        tableName: table.tableName,
        items: orderItems,
        totalAmount: cartSubtotal // Base on requirements, adjust tax later if needed in backend
      });

      setCart([]);
      await fetchData();
    } catch (error) {
      console.error("Error adding items to order:", error);
      alert("Failed to confirm order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMenu = menuItems.filter(item => {
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  if (!table) return <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center">Loading...</div>;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 flex overflow-hidden font-sans">
      {/* LEFT PANEL (25%) */}
      <div className="w-1/4 bg-white border-r border-slate-200 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
        <div className="p-6 border-b border-slate-100 flex items-center gap-4 bg-slate-900 text-white">
          <button onClick={() => navigate('/dashboard/tables')} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold leading-tight">{table.tableName}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${table.status === 'Occupied' ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></span>
              <span className="text-xs font-medium text-slate-300 uppercase tracking-wider">{table.status}</span>
            </div>
          </div>
        </div>

        <div className="p-6 border-b border-slate-100 flex gap-4">
          <div className="flex-1 bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col items-center justify-center text-center">
            <Clock size={20} className="text-slate-400 mb-2" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Duration</p>
            <p className="font-bold text-slate-900">{table.timeOccupied}</p>
          </div>
          <div className="flex-1 bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col items-center justify-center text-center">
            <Receipt size={20} className="text-slate-400 mb-2" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Current Bill</p>
            <p className="font-bold text-emerald-600">₹{table.totalBill.toFixed(2)}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <ListOrdered size={16} /> Order Timeline
          </h3>
          
          {table.orders.length === 0 ? (
             <div className="text-center py-12 text-slate-400">
               <Utensils size={32} className="mx-auto mb-3 opacity-20" />
               <p className="text-sm font-medium">No active orders</p>
             </div>
          ) : (
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
              {table.orders.map((order, i) => (
                <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                   <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                     <ChefHat size={16} />
                   </div>
                   <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-800">{order.orderId}</span>
                        <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded-full ${
                          order.status === 'Ready' ? 'bg-emerald-50 text-emerald-600' : 
                          order.status === 'Preparing' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'
                        }`}>{order.status}</span>
                      </div>
                      <div className="space-y-1.5">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="text-xs flex justify-between">
                            <span className="text-slate-600 font-medium">{item.quantity}x {item.name}</span>
                          </div>
                        ))}
                      </div>
                   </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CENTER PANEL (45%) */}
      <div className="flex-[0.45] bg-slate-50 flex flex-col relative z-0">
        <div className="p-6 bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search menu items or categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-100 border-transparent focus:bg-white focus:border-[#6C4DFF] focus:ring-4 focus:ring-indigo-500/10 rounded-2xl text-sm font-semibold transition-all outline-none"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {categories.map((cat, i) => (
              <button
                key={i}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-6 py-3 rounded-2xl text-sm font-bold transition-all ${
                  selectedCategory === cat 
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' 
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 lg:grid-cols-3 gap-4 content-start">
          <AnimatePresence>
            {filteredMenu.map((item) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                key={item._id}
                onClick={() => addToCart(item)}
                className="bg-white rounded-3xl p-3 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-indigo-200 transition-all cursor-pointer group flex flex-col relative overflow-hidden"
              >
                <div className="aspect-square rounded-2xl overflow-hidden mb-3 bg-slate-100 relative">
                  <img src={item.image || 'https://via.placeholder.com/150'} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  {item.category && (
                     <div className="absolute top-2 left-2 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-[10px] font-bold text-slate-700 shadow-sm">
                       {item.category}
                     </div>
                  )}
                </div>
                <div className="flex-1 flex flex-col">
                  <h4 className="font-bold text-slate-900 text-sm leading-tight mb-1 line-clamp-2">{item.name}</h4>
                  <div className="mt-auto flex justify-between items-end">
                    <span className="font-black text-emerald-600">₹{item.price.toFixed(2)}</span>
                    <button className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-[#6C4DFF] group-hover:text-white flex items-center justify-center text-slate-500 transition-colors">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* RIGHT PANEL (30%) */}
      <div className="flex-[0.30] bg-white border-l border-slate-200 flex flex-col shadow-[-4px_0_24px_rgba(0,0,0,0.02)] z-10 relative">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart size={20} className="text-[#6C4DFF]"/> Current Order
          </h2>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="text-xs font-bold text-red-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
              Clear All
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
          <AnimatePresence>
            {cart.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center text-slate-400">
                <ShoppingCart size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-medium">Cart is empty</p>
                <p className="text-xs mt-1">Select items from the menu</p>
              </motion.div>
            ) : (
              cart.map((item) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  key={item._id} 
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm"
                >
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <h4 className="font-bold text-slate-900 text-sm">{item.name}</h4>
                    <span className="font-black text-emerald-600 text-sm shrink-0">₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">₹{item.price.toFixed(2)} each</span>
                    <div className="flex items-center gap-3 bg-slate-100 rounded-xl p-1 border border-slate-200">
                      <button onClick={() => removeFromCart(item._id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white shadow-sm hover:text-red-500 transition-colors">
                        {item.quantity === 1 ? <Trash2 size={14} /> : <Minus size={14} />}
                      </button>
                      <span className="w-4 text-center text-sm font-bold text-slate-900">{item.quantity}</span>
                      <button onClick={() => addToCart(item)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm hover:bg-slate-800 transition-colors">
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Sticky Footer */}
        <div className="bg-white border-t border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20">
          <div className="p-6 space-y-3">
            <div className="flex justify-between text-sm font-medium text-slate-500">
              <span>Subtotal</span>
              <span>₹{cartSubtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-medium text-slate-500">
              <span>Tax (5%)</span>
              <span>₹{tax.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm font-medium text-emerald-500">
                <span>Discount</span>
                <span>-₹{discount.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
              <span className="text-sm font-bold text-slate-900 uppercase tracking-wider">Grand Total</span>
              <span className="text-2xl font-black text-slate-900">₹{cartTotal.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="px-6 pb-6 grid grid-cols-2 gap-3">
            <button className="py-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors flex items-center justify-center gap-2">
              Save Draft
            </button>
            <button 
              disabled={cart.length === 0 || isSubmitting}
              onClick={handleConfirmOrder}
              className="py-4 rounded-2xl bg-[#6C4DFF] hover:bg-indigo-600 text-white font-bold text-sm shadow-xl shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
            >
              {isSubmitting ? 'Sending...' : 'Confirm Order'} <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TablePOS;
