import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { 
  ChefHat, 
  Search, 
  ShoppingBag, 
  Plus, 
  Minus, 
  X, 
  CheckCircle, 
  ArrowRight,
  TrendingUp,
  Heart,
  AlertTriangle
} from 'lucide-react';

const CustomerMenu = () => {
  const { restaurantId, tableNo } = useParams();
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState(["Recommended", "Burgers", "Pizzas", "Salads", "Drinks"]);
  const [activeCategory, setActiveCategory] = useState("Recommended");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [restaurantName, setRestaurantName] = useState("Osteria Bella");
  const [restaurantStatus, setRestaurantStatus] = useState("active");

  // Realistic mock menu items in case the backend DB doesn't have custom items yet
  const defaultItems = [
    {
      _id: "default-1",
      name: "Double Truffle Burger",
      price: 180,
      category: "Burgers",
      image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80",
      description: "Caramelized onions, Swiss cheese, fresh truffle aioli on brioche.",
      isAvailable: true,
      isBestSeller: true
    },
    {
      _id: "default-2",
      name: "Woodfired Margherita Pizza",
      price: 240,
      category: "Pizzas",
      image: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=800&q=80",
      description: "San Marzano tomatoes, fresh mozzarella, extra virgin olive oil, sweet basil.",
      isAvailable: true,
      isBestSeller: true
    },
    {
      _id: "default-3",
      name: "Avocado Sourdough Toast",
      price: 150,
      category: "Salads",
      image: "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?w=800&q=80",
      description: "Smashed Hass avocado, heirloom cherry tomatoes, feta crumbles.",
      isAvailable: true,
      isBestSeller: false
    },
    {
      _id: "default-4",
      name: "Craft Wheat Beer",
      price: 160,
      category: "Drinks",
      image: "https://images.unsplash.com/photo-1532634922-8fe0b757fb13?w=800&q=80",
      description: "Crisp German wheat beer with distinct aromatic hints of banana and clove.",
      isAvailable: true,
      isBestSeller: false
    },
    {
      _id: "default-5",
      name: "Chocolate Lava Cake",
      price: 140,
      category: "Recommended",
      image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=80",
      description: "Warm Belgian chocolate cake with a rich molten lava core.",
      isAvailable: true,
      isBestSeller: true
    }
  ];

  useEffect(() => {
    fetchRestaurantStatus();
    fetchRestaurantMenu();
  }, [restaurantId]);

  const fetchRestaurantStatus = async () => {
    if (!restaurantId) return;
    try {
      const res = await axios.get(`http://localhost:5000/api/auth/restaurant/${restaurantId}/status`);
      if (res.data) {
        setRestaurantName(res.data.restaurantName || "Osteria Bella");
        setRestaurantStatus(res.data.status || "active");
      }
    } catch (err) {
      console.warn("Could not fetch restaurant status:", err);
    }
  };

  const fetchRestaurantMenu = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/menu`);
      if (res.data && res.data.length > 0) {
        // Map backend category names or format properly
        const uniqueCategories = ["Recommended", ...new Set(res.data.map(item => item.category))];
        setCategories(uniqueCategories);
        setMenuItems(res.data);
      } else {
        setMenuItems(defaultItems);
      }
    } catch (err) {
      console.warn("Could not fetch backend menu, falling back to gorgeous defaults:", err);
      setMenuItems(defaultItems);
    }
  };

  // Add to cart
  const addToCart = (item) => {
    if (restaurantStatus !== 'active') {
      alert("Ordering is currently disabled for this restaurant.");
      return;
    }
    const existing = cart.find(cartItem => cartItem._id === item._id);
    if (existing) {
      setCart(cart.map(cartItem => 
        cartItem._id === item._id 
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  // Remove / decrement from cart
  const removeFromCart = (itemId) => {
    const existing = cart.find(cartItem => cartItem._id === itemId);
    if (existing.quantity === 1) {
      setCart(cart.filter(cartItem => cartItem._id !== itemId));
    } else {
      setCart(cart.map(cartItem => 
        cartItem._id === itemId 
          ? { ...cartItem, quantity: cartItem.quantity - 1 }
          : cartItem
      ));
    }
  };

  // Calculate totals
  const totalItems = cart.reduce((acc, curr) => acc + curr.quantity, 0);
  const subtotal = cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

  const handleCheckout = async () => {
    if (restaurantStatus !== 'active') {
      alert("Ordering is currently disabled for this restaurant.");
      return;
    }
    try {
      const formattedItems = cart.map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity
      }));

      await axios.post('http://localhost:5000/api/orders', {
        restaurantId,
        tableName: decodeURIComponent(tableNo) || 'Table 4',
        items: formattedItems,
        totalAmount: subtotal
      });

      setOrderPlaced(true);
      setCart([]);
      setIsCartOpen(false);
    } catch (err) {
      console.error('Error placing order:', err);
      alert(err.response?.data?.message || 'Failed to place order. Please try again.');
    }
  };

  // Filters items by category & search query
  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (activeCategory === "Recommended") {
      return matchesSearch && (item.isBestSeller || item.price > 150);
    }
    return matchesSearch && item.category === activeCategory;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex justify-center items-start py-0 sm:py-8 font-sans">
      {/* Mobile viewport frame simulation */}
      <div className="w-full max-w-md bg-white min-h-screen sm:min-h-[840px] sm:rounded-3xl sm:shadow-2xl sm:border sm:border-slate-100 flex flex-col relative overflow-hidden">
        
        {/* Success screen overlay */}
        {orderPlaced && (
          <div className="absolute inset-0 bg-white z-50 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-inner animate-bounce">
              <CheckCircle size={44} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Order Confirmed!</h2>
            <p className="text-slate-500 text-sm mb-8">Your order has been sent straight to the kitchen. Lay back, we're preparing it fresh for you!</p>
            
            <div className="bg-slate-50 p-4 rounded-2xl w-full border border-slate-100 mb-8 flex justify-between items-center text-sm font-semibold">
              <span className="text-slate-500">Destination</span>
              <span className="text-slate-900 bg-white px-3 py-1 rounded-xl border border-slate-150 shadow-sm">Table {tableNo || 4}</span>
            </div>

            <button 
              onClick={() => setOrderPlaced(false)}
              className="w-full py-4 bg-[#10B981] hover:bg-emerald-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              Order More Items
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* Head Bar */}
        <header className="px-6 py-5 bg-white border-b border-slate-50 sticky top-0 z-20 flex justify-between items-center shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-[#6C4DFF] to-indigo-600 rounded-xl flex items-center justify-center text-white">
                <ChefHat size={16} />
              </div>
              <span className="text-md font-extrabold text-slate-900 tracking-tight">{restaurantName}</span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold tracking-wide mt-1 uppercase">Table QR Code Mode</p>
          </div>

          <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl font-bold text-xs border border-slate-200">
            Table {tableNo || 4}
          </span>
        </header>

        {restaurantStatus && restaurantStatus !== 'active' && (
          <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-start gap-3 z-30 animate-in slide-in-from-top duration-300">
            <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <p className="font-extrabold text-xs text-red-900 uppercase tracking-wider">Ordering Suspended</p>
              <p className="text-[11px] font-semibold text-red-700 mt-1 leading-relaxed">
                This restaurant's ordering services are temporarily suspended. You can browse the menu, but placing orders is disabled.
              </p>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="px-6 pt-5 pb-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search dishes, drinks, desserts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#6C4DFF]/10 focus:border-[#6C4DFF] transition-all bg-slate-50"
            />
          </div>
        </div>

        {/* Category Pills Slider */}
        <div className="overflow-x-auto scrollbar-none flex gap-2.5 px-6 py-3 sticky top-[77px] bg-white z-10">
          {categories.map((cat, i) => (
            <button
              key={i}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                activeCategory === cat 
                  ? 'bg-slate-900 text-white shadow-md' 
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Food Items List */}
        <div className="flex-1 px-6 pb-28 pt-2 space-y-4">
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-extrabold text-sm text-slate-900 tracking-tight">{activeCategory} Selection</h3>
            <span className="text-[10px] text-slate-400 font-bold">{filteredItems.length} items</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {filteredItems.map((item) => (
              <div 
                key={item._id} 
                className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between group relative"
              >
                {/* Heart Button */}
                <button className="absolute top-2 right-2 p-1.5 bg-white/70 backdrop-blur-md hover:bg-white rounded-full text-slate-400 hover:text-red-500 shadow-sm transition-colors z-10">
                  <Heart size={14} />
                </button>

                <div>
                  <div className="h-32 overflow-hidden bg-slate-100 relative">
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-350"
                    />
                    {item.isBestSeller && (
                      <span className="absolute bottom-2 left-2 bg-[#6C4DFF] text-white px-2 py-0.5 rounded-lg text-[9px] font-extrabold tracking-wider uppercase flex items-center gap-0.5 shadow-md">
                        <TrendingUp size={8} />
                        Best Seller
                      </span>
                    )}
                  </div>
                  
                  <div className="p-3">
                    <h4 className="font-bold text-slate-800 text-xs truncate">{item.name}</h4>
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 h-7 leading-relaxed">{item.description || 'Delicious home-style recipe prepared with fresh ingredients.'}</p>
                  </div>
                </div>

                <div className="p-3 pt-0 flex justify-between items-center">
                  <span className="font-extrabold text-xs text-slate-900">₹{item.price}</span>
                  
                  {/* Cart logic controller */}
                  {restaurantStatus !== 'active' ? (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-xl">
                      Unavailable
                    </span>
                  ) : cart.find(c => c._id === item._id) ? (
                    <div className="flex items-center gap-2 bg-[#10B981]/10 rounded-xl px-1.5 py-0.5 border border-[#10B981]/20">
                      <button onClick={() => removeFromCart(item._id)} className="text-[#10B981] hover:scale-110 transition-transform">
                        <Minus size={12} />
                      </button>
                      <span className="text-xs font-bold text-[#10B981] min-w-[12px] text-center">
                        {cart.find(c => c._id === item._id).quantity}
                      </span>
                      <button onClick={() => addToCart(item)} className="text-[#10B981] hover:scale-110 transition-transform">
                        <Plus size={12} />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => addToCart(item)}
                      className="bg-slate-900 hover:bg-slate-800 text-white p-2 rounded-xl transition-colors shadow-sm flex items-center justify-center"
                    >
                      <Plus size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Floating Bottom Sticky Cart */}
        {totalItems > 0 && (
          <div className="absolute bottom-6 left-6 right-6 bg-slate-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-3xl flex justify-between items-center shadow-xl shadow-slate-900/30 z-30 transition-all animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center gap-3 text-white">
              <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center relative">
                <ShoppingBag size={18} />
                <span className="absolute -top-1.5 -right-1.5 bg-[#6C4DFF] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold border-2 border-slate-900">
                  {totalItems}
                </span>
              </div>
              <div>
                <p className="text-[10px] text-white/60 font-bold uppercase tracking-wider">Subtotal</p>
                <p className="text-sm font-extrabold">₹{subtotal.toFixed(2)}</p>
              </div>
            </div>

            <button 
              onClick={() => setIsCartOpen(true)}
              className="px-5 py-2.5 bg-[#10B981] hover:bg-emerald-600 text-white font-extrabold rounded-2xl transition-all shadow-md flex items-center gap-1 text-xs"
            >
              Checkout Menu
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Cart Drawer Modal */}
        {isCartOpen && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-40 flex flex-col justify-end">
            <div className="bg-white rounded-t-3xl p-6 flex flex-col max-h-[80%] animate-in slide-in-from-bottom duration-300">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ShoppingBag size={20} className="text-[#6C4DFF]" />
                  Your Cart Selection
                </h3>
                <button onClick={() => setIsCartOpen(false)} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500">
                  <X size={18} />
                </button>
              </div>

              {/* Cart List */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin mb-6">
                {cart.map((cartItem) => (
                  <div key={cartItem._id} className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100/50">
                    <div className="flex items-center gap-3">
                      <img src={cartItem.image} alt={cartItem.name} className="w-12 h-12 rounded-xl object-cover" />
                      <div>
                        <h4 className="font-bold text-xs text-slate-800">{cartItem.name}</h4>
                        <span className="text-[10px] text-slate-400 font-extrabold mt-0.5 block">₹{cartItem.price} each</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white rounded-xl px-2.5 py-1 border border-slate-150 shadow-sm">
                      <button onClick={() => removeFromCart(cartItem._id)} className="text-slate-400 hover:text-red-500">
                        <Minus size={12} />
                      </button>
                      <span className="text-xs font-bold text-slate-800 min-w-[12px] text-center">
                        {cartItem.quantity}
                      </span>
                      <button onClick={() => addToCart(cartItem)} className="text-[#6C4DFF] hover:scale-110 transition-transform">
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Checkout details */}
              <div className="border-t border-slate-100 pt-5 space-y-3">
                <div className="flex justify-between text-xs text-slate-400 font-bold">
                  <span>Destination Table</span>
                  <span className="text-slate-800">Table {tableNo || 4}</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-4">
                  <span>Total Amount Due</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>

                <button 
                  onClick={handleCheckout}
                  disabled={restaurantStatus !== 'active'}
                  className={`w-full py-4 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 ${
                    restaurantStatus !== 'active'
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-[#10B981] hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                  }`}
                >
                  {restaurantStatus !== 'active' ? 'Ordering Disabled' : 'Send Order to Kitchen'}
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CustomerMenu;
