import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, UserCircle, ListOrdered, 
  ShoppingCart, Plus, Minus, ChevronRight, 
  Trash2, Receipt, ChefHat, Package
} from 'lucide-react';

const BillingPOS = () => {
  const navigate = useNavigate();
  const { restaurant, loading } = useContext(AuthContext);

  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [cart, setCart] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [customerName, setCustomerName] = useState('');
  
  const [activeOrders, setActiveOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [orderTab, setOrderTab] = useState('Active');

  const fetchData = async () => {
    if (!restaurant) return;
    try {
      const [ordersRes, menuRes] = await Promise.all([
        axios.get('http://localhost:5000/api/orders', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get('http://localhost:5000/api/menu')
      ]);

      // Set Menu
      const availableMenu = menuRes.data.filter(item => item.isAvailable);
      setMenuItems(availableMenu);
      const uniqueCategories = [...new Set(availableMenu.map(item => item.category).filter(Boolean))];
      setCategories(['All', ...uniqueCategories]);

      // Process Parcel Orders
      const allParcel = ordersRes.data.filter(o => o.tableName.toLowerCase() === 'parcel');
      
      const active = allParcel.filter(o => !['Completed', 'Cancelled', 'Served'].includes(o.status));
      active.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setActiveOrders(active);

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const completed = allParcel.filter(o => {
        return ['Completed', 'Served'].includes(o.status) && new Date(o.updatedAt || o.createdAt) >= oneHourAgo;
      });
      completed.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setCompletedOrders(completed);

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
  }, [loading, restaurant]);

  const handleCompleteOrder = async (orderId) => {
    try {
      await axios.put(`http://localhost:5000/api/orders/${orderId}/status`, {
        status: 'Completed',
        paymentStatus: 'Paid'
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchData();
    } catch (error) {
      console.error("Error completing order:", error);
      alert("Failed to complete order.");
    }
  };

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
    if (cart.length === 0) return;
    setIsSubmitting(true);
    try {
      const orderItems = cart.map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      }));

      await axios.post('http://localhost:5000/api/orders', {
        restaurantId: restaurant._id || restaurant.id,
        tableName: 'Parcel',
        customerName: customerName || 'Guest',
        items: orderItems,
        totalAmount: cartSubtotal 
      });

      setCart([]);
      setCustomerName('');
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

  return (
    <div className="flex-1 flex bg-slate-50 overflow-hidden font-sans h-full">
      {/* LEFT PANEL (25%) */}
      <div className="w-1/4 bg-white border-r border-slate-200 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col justify-center bg-white z-10 shrink-0">
          <h1 className="text-xl font-bold leading-tight flex items-center gap-2 text-slate-900">
            <Package size={24} className="text-[#6C4DFF]" /> Parcel POS
          </h1>
          <p className="text-xs text-slate-500 mt-1">Direct takeaway billing</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <ListOrdered size={16} /> Parcel Orders
            </h3>
            <div className="flex bg-white rounded-lg p-0.5 border border-slate-200">
              <button 
                onClick={() => setOrderTab('Active')}
                className={`text-[10px] font-bold uppercase px-3 py-1 rounded-md transition-all ${orderTab === 'Active' ? 'bg-[#6C4DFF] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Active
              </button>
              <button 
                onClick={() => setOrderTab('Completed')}
                className={`text-[10px] font-bold uppercase px-3 py-1 rounded-md transition-all ${orderTab === 'Completed' ? 'bg-[#6C4DFF] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Completed
              </button>
            </div>
          </div>
          
          {(() => {
            const displayedOrders = orderTab === 'Active' ? activeOrders : completedOrders;
            if (displayedOrders.length === 0) {
              return (
                 <div className="text-center py-12 text-slate-400">
                   <Package size={32} className="mx-auto mb-3 opacity-20" />
                   <p className="text-sm font-medium">No {orderTab.toLowerCase()} parcel orders</p>
                 </div>
              );
            }
            return (
              <div className="space-y-4">
                {displayedOrders.map((order, i) => (
                  <div key={i} className={`bg-white p-4 rounded-2xl border ${orderTab === 'Completed' ? 'border-emerald-100 opacity-75' : 'border-slate-100'} shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-colors`}>
                    <div className="flex justify-between items-center mb-3 border-b border-slate-50 pb-2">
                      <div>
                        <span className="text-sm font-bold text-slate-800 block">{order.orderId || order._id.slice(-6).toUpperCase()}</span>
                        <span className="text-xs font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                          <UserCircle size={12} /> {order.customerName || 'Guest'}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                        order.status === 'Ready' ? 'bg-emerald-50 text-emerald-600' : 
                        order.status === 'Preparing' ? 'bg-amber-50 text-amber-600' : 
                        order.status === 'Completed' || order.status === 'Served' ? 'bg-slate-100 text-slate-600' :
                        'bg-indigo-50 text-indigo-600'
                      }`}>{order.status}</span>
                    </div>
                    <div className="space-y-1.5">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="text-xs flex justify-between">
                          <span className="text-slate-600 font-medium">{item.quantity}x {item.name}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-50 flex justify-between items-center">
                      <span className="text-xs text-slate-400">Total</span>
                      <span className="font-bold text-slate-800">₹{order.totalAmount.toFixed(2)}</span>
                    </div>
                    {orderTab === 'Active' && (
                      <div className="mt-3">
                        <button 
                          onClick={() => handleCompleteOrder(order._id)}
                          className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-colors"
                        >
                          Mark as Completed
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {/* CENTER PANEL (45%) */}
      <div className="flex-[0.45] bg-slate-50 flex flex-col relative z-0 h-full">
        <div className="px-6 py-5 bg-white border-b border-slate-100 z-10 flex flex-col gap-4 shrink-0">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#6C4DFF] focus:ring-2 focus:ring-indigo-500/10 rounded-xl text-sm font-medium transition-all outline-none"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {categories.map((cat, i) => (
              <button
                key={i}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  selectedCategory === cat 
                    ? 'bg-slate-900 text-white shadow-md' 
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
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
      <div className="flex-[0.30] bg-white border-l border-slate-200 flex flex-col shadow-[-4px_0_24px_rgba(0,0,0,0.02)] z-10 relative h-full">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col gap-4 bg-white z-10 shrink-0">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShoppingCart size={20} className="text-[#6C4DFF]"/> Current Order
            </h2>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-xs font-bold text-red-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                Clear All
              </button>
            )}
          </div>
          
          <div className="relative">
            <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Customer Name (Optional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#6C4DFF] focus:ring-2 focus:ring-indigo-500/10 rounded-xl text-sm font-medium transition-all outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
          <AnimatePresence>
            {cart.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center text-slate-400 pb-12">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                  <ShoppingCart size={32} className="text-slate-300" />
                </div>
                <p className="text-sm font-bold text-slate-600">Cart is empty</p>
                <p className="text-xs text-slate-400 mt-1">Add items from the menu</p>
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
          
          <div className="px-6 pb-6">
            <button 
              disabled={cart.length === 0 || isSubmitting}
              onClick={handleConfirmOrder}
              className="w-full py-4 rounded-2xl bg-[#6C4DFF] hover:bg-indigo-600 text-white font-bold text-sm shadow-xl shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
            >
              {isSubmitting ? 'Sending...' : 'Confirm Order'} <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingPOS;
