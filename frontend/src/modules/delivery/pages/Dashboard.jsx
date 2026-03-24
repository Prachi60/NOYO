import React, { useState, useEffect } from "react";
import {
  Bell,
  Star,
  TrendingUp,
  Package,
  MapPin,
  Navigation,
  Clock,
  CheckCircle,
  XCircle,
  IndianRupee,
  AlertCircle,
  Store,
  Building2, // Fallback for Store
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Button from "@/shared/components/ui/Button";
import Card from "@/shared/components/ui/Card";

import { useAuth } from "@/core/context/AuthContext";
import { deliveryApi } from "../services/deliveryApi";

const Dashboard = () => {
  console.log("Dashboard Rendering - Icons:", {
    Store: typeof Store,
    Building2: typeof Building2,
  });
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [isOnline, setIsOnline] = useState(user?.isOnline || false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [earnings, setEarnings] = useState({
    today: 0,
    deliveries: 0,
    incentives: 0,
    cashCollected: 0,
  });

  // Sync isOnline with user profile from context
  useEffect(() => {
    if (user) {
      setIsOnline(user.isOnline);
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const response = await deliveryApi.getStats();
      if (response.data.success) {
        console.log("Stats Fetched:", response.data.result);
        setEarnings((prev) => ({
          ...prev,
          ...response.data.result,
        }));
      }
    } catch (error) {
      console.error("Failed to fetch statistics:", error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await deliveryApi.getNotifications();
      if (response.data.success && response.data.result) {
        setUnreadCount(response.data.result.unreadCount || 0);
      }
    } catch (error) {
      console.error("Failed to fetch notifications");
    }
  };

  const fetchAvailableOrders = async () => {
    try {
      const response = await deliveryApi.getAvailableOrders();
      if (response.data.success) {
        // Support both plural 'results' and singular 'result' from different backend versions
        const orders = response.data.results || response.data.result || [];
        setAvailableOrders(orders);
      }
    } catch (error) {
      console.error("Failed to fetch available orders:", error);
    }
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      const response = await deliveryApi.acceptOrder(orderId);
      if (response.data.success) {
        toast.success("Order accepted!");
        navigate(`/delivery/order-details/${orderId}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to accept order");
    }
  };

  const handleSkipOrder = async (orderId) => {
    try {
      await deliveryApi.skipOrder(orderId);
      setAvailableOrders((prev) => prev.filter((o) => o.orderId !== orderId));
      toast.info("Order skipped");
    } catch (error) {
      toast.error("Failed to skip order");
    }
  };

  useEffect(() => {
    fetchStats();
    fetchNotifications();
    if (isOnline) fetchAvailableOrders();
    const interval = setInterval(() => {
      fetchNotifications();
      if (isOnline) fetchAvailableOrders();
    }, 30000);
    return () => clearInterval(interval);
  }, [isOnline]);

  const handleOnlineToggle = async () => {
    const newStatus = !isOnline;
    try {
      await deliveryApi.updateProfile({ isOnline: newStatus });
      await refreshUser(); // Refresh global auth state
      setIsOnline(newStatus);
      if (newStatus) {
        toast.success("You are now ONLINE. Finding orders...");
      } else {
        toast.info("You are now OFFLINE. No new orders.");
      }
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="bg-gray-50/50 min-h-screen pb-24 relative overflow-hidden font-sans">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 pt-12 pb-4 flex justify-between items-center sticky top-0 z-30 transition-all duration-300">
        <div className="flex items-center space-x-3">
          <div
            className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary ring-2 ring-primary/20 shadow-sm cursor-pointer"
            onClick={() => navigate("/delivery/profile")}>
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
          <div
            onClick={() => navigate("/delivery/profile")}
            className="cursor-pointer">
            <h2 className="ds-h2 leading-tight">
              {user?.name || "Delivery Partner"}
            </h2>
            <div className="flex items-center text-sm font-medium">
              <span className="flex items-center bg-yellow-50 text-yellow-600 px-1.5 py-0.5 rounded border border-yellow-100">
                <Star size={12} fill="currentColor" className="mr-1" />
                4.8
              </span>
              <span className="text-gray-300 mx-2">•</span>
              <span className="ds-caption text-gray-500">ID: 882190</span>
            </div>
          </div>
        </div>
        <div
          className="relative p-2.5 bg-gray-50 border border-gray-100 rounded-full hover:bg-gray-100 transition-colors cursor-pointer group"
          onClick={() => navigate("/delivery/notifications")}>
          <Bell
            size={20}
            className="text-gray-600 group-hover:text-primary transition-colors"
          />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>
          )}
        </div>
      </header>

      {/* Online/Offline Toggle */}
      <div className="px-6 py-6">
        <motion.div
          onClick={handleOnlineToggle}
          className={`relative w-full h-16 rounded-full flex items-center p-1 cursor-pointer shadow-inner transition-colors duration-500 ${
            isOnline
              ? "bg-green-500/10 border border-green-200"
              : "bg-red-500/10 border border-red-200"
          }`}
          whileTap={{ scale: 0.98 }}>
          <div
            className={`w-1/2 h-full flex items-center justify-center font-bold tracking-wide z-10 transition-all duration-300 ${isOnline ? "text-green-700" : "text-gray-400 opacity-50"}`}>
            ONLINE
          </div>
          <div
            className={`w-1/2 h-full flex items-center justify-center font-bold tracking-wide z-10 transition-all duration-300 ${!isOnline ? "text-red-600" : "text-gray-400 opacity-50"}`}>
            OFFLINE
          </div>
          <motion.div
            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full shadow-lg flex items-center justify-center border transition-colors duration-300 ${
              isOnline
                ? "bg-green-500 border-green-400"
                : "bg-red-500 border-red-400"
            }`}
            animate={{ x: isOnline ? "100%" : "0%" }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{ x: isOnline ? "2px" : "0" }} // Offset adjustment
          >
            {isOnline ? (
              <CheckCircle className="text-white" size={24} />
            ) : (
              <XCircle className="text-white" size={24} />
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="px-6 space-y-6">
        {/* Earnings Card */}
        <Card className="bg-white shadow-sm border border-gray-100 overflow-hidden relative">
          {/* Background Decoration */}
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>

          <div className="flex justify-between items-center mb-4 relative z-10">
            <h3 className="ds-caption font-bold tracking-wider">
              Today's Earnings
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/delivery/earnings")}
              className="text-primary hover:text-primary/80 hover:bg-primary/5 h-8 px-3 text-xs font-bold rounded-full">
              View Details
            </Button>
          </div>

          <div className="flex items-baseline mb-6 relative z-10">
            <span className="text-2xl font-bold text-gray-400 mr-1">₹</span>
            <span className="text-4xl font-extrabold text-gray-900 tracking-tight">
              {earnings.today}
            </span>
            <span className="ml-3 text-green-600 text-xs font-bold flex items-center bg-green-50 border border-green-100 px-2 py-1 rounded-full">
              <TrendingUp size={12} className="mr-1" /> +12%
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-gray-50 pt-4 relative z-10">
            <div className="text-center group cursor-pointer">
              <div className="flex justify-center mb-2 text-blue-600 bg-blue-50 group-hover:bg-blue-100 transition-colors w-10 h-10 rounded-full items-center mx-auto">
                <Package size={18} />
              </div>
              <p className="ds-caption mb-0.5">Orders</p>
              <p className="font-bold text-gray-900">{earnings.deliveries}</p>
            </div>
            <div className="text-center border-l border-r border-gray-50 group cursor-pointer">
              <div className="flex justify-center mb-2 text-amber-500 bg-amber-50 group-hover:bg-amber-100 transition-colors w-10 h-10 rounded-full items-center mx-auto">
                <Star size={18} />
              </div>
              <p className="ds-caption mb-0.5">Incentives</p>
              <p className="font-bold text-gray-900">₹{earnings.incentives}</p>
            </div>
            <div className="text-center group cursor-pointer">
              <div className="flex justify-center mb-2 text-green-600 bg-green-50 group-hover:bg-green-100 transition-colors w-10 h-10 rounded-full items-center mx-auto">
                <IndianRupee size={18} />
              </div>
              <p className="ds-caption mb-0.5">Cash</p>
              <p className="font-bold text-gray-900">
                ₹{earnings.cashCollected}
              </p>
            </div>
          </div>
        </Card>

        {/* Active Order / Status */}
        <AnimatePresence mode="wait">
          {isOnline ? (
            availableOrders.length > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <h3 className="ds-h3 text-gray-800">
                    Available Orders ({availableOrders.length})
                  </h3>
                  <div className="flex items-center space-x-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                      Live
                    </span>
                  </div>
                </div>
                {availableOrders.map((order) => (
                  <motion.div
                    key={order.orderId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden">
                    {/* COD Tag */}
                    {(order.payment?.method?.toLowerCase() === "cash" ||
                      order.payment?.method?.toLowerCase() === "cod") && (
                      <div className="absolute top-0 right-0 bg-orange-600 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl shadow-sm z-10 flex items-center">
                        <IndianRupee size={12} className="mr-1" /> CASH ON
                        DELIVERY
                      </div>
                    )}

                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                          {typeof Store !== "undefined" ? (
                            <Store size={24} />
                          ) : (
                            <Building2 size={24} />
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 truncate max-w-[150px]">
                            {order.seller?.shopName || "Unknown Seller"}
                          </h4>
                          <p className="text-xs text-gray-500 flex items-center mt-0.5">
                            <MapPin size={12} className="mr-1" />{" "}
                            {String(
                              order.seller?.address || "No address",
                            ).slice(0, 30)}
                            ...
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          ₹{Math.round(order.pricing?.total * 0.1)}
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">
                          Earning
                        </p>
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <Button
                        variant="outline"
                        className="flex-1 py-3 text-xs font-bold border-gray-200"
                        onClick={() => handleSkipOrder(order.orderId)}>
                        SKIP
                      </Button>
                      <Button
                        className="flex-2 bg-primary py-3 text-xs font-bold px-8 shadow-lg shadow-primary/20"
                        onClick={() => handleAcceptOrder(order.orderId)}>
                        ACCEPT
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div
                key="searching"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white rounded-2xl p-8 text-center border-2 border-dashed border-gray-200 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-50/50 to-purple-50/50 opacity-50"></div>
                <div className="relative z-10">
                  <div className="relative w-24 h-24 mx-auto mb-6">
                    <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-20"></div>
                    <div className="absolute inset-2 bg-blue-100 rounded-full animate-ping opacity-40 delay-150"></div>
                    <div className="relative w-full h-full bg-blue-50 rounded-full flex items-center justify-center border border-blue-100 shadow-sm">
                      <MapPin size={36} className="text-blue-600" />
                    </div>
                  </div>
                  <h3 className="ds-h3 mb-2 text-gray-800">
                    Finding Orders Nearby...
                  </h3>
                  <p className="text-sm text-gray-500 max-w-[220px] mx-auto mb-6">
                    We're looking for delivery requests in your area. Stay
                    online!
                  </p>
                </div>
              </motion.div>
            )
          ) : (
            <motion.div
              key="offline"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-100">
                <AlertCircle size={32} className="text-gray-400" />
              </div>
              <h3 className="ds-h3 mb-2">You are Offline</h3>
              <p className="text-sm text-gray-500 max-w-[250px] mx-auto">
                Go online to start receiving delivery requests and earning
                money.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Dashboard;
