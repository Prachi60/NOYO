import React, { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import { Toaster, toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { BellRing, Clock, Check, X, MapPin, Navigation, Package } from "lucide-react";
import { deliveryApi } from "../services/deliveryApi";
import { useAuth } from "@/core/context/AuthContext";
import { cn } from "@/lib/utils";

const DeliveryLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeOrder, setActiveOrder] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [shownOrderIds, setShownOrderIds] = useState(new Set());
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [availableOrdersCount, setAvailableOrdersCount] = useState(0);

  const hideBottomNavRoutes = [
    "/delivery/login",
    "/delivery/auth",
    "/delivery/splash",
    "/delivery/navigation",
    "/delivery/confirm-delivery",
    "/delivery/order-details",
  ];

  const shouldShowBottomNav = !hideBottomNavRoutes.some((route) =>
    location.pathname.includes(route),
  );

  // Polling for available orders
  useEffect(() => {
    const fetchOrders = async () => {
      // Only poll if online and NOT currently in an active order alert
      if (!user?.isOnline || activeOrder) return;

      try {
        console.group("Delivery Polling Log");
        console.log("UserID:", user?._id || user?.id);
        const res = await deliveryApi.getAvailableOrders();
        if (res.data.success) {
          const availableOrders = res.data.results || res.data.result || [];
          setAvailableOrdersCount(availableOrders.length);
          console.log(`Available orders in range: ${availableOrders.length}`);

          // Find a new order to show
          const newOrder = availableOrders.find(o => !shownOrderIds.has(o.orderId));
          if (newOrder) {
            console.log("New order found! Displaying modal:", newOrder.orderId);
            setActiveOrder({
              id: newOrder.orderId,
              mongoId: newOrder._id,
              pickup: newOrder.seller?.shopName || "Seller",
              drop: newOrder.address?.address || "Customer Address",
              distance: "Nearby",
              estTime: "10-15 min",
              value: newOrder.pricing?.total || 0,
              earnings: Math.round((newOrder.pricing?.total || 0) * 0.1),
            });
            setShownOrderIds(prev => new Set(prev).add(newOrder.orderId));

            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play().catch(e => console.log("Audio play blocked"));
          } else if (availableOrders.length > 0) {
            console.log("Orders found but already shown:", availableOrders.map(o => o.orderId));
          }
        }
        console.groupEnd();
      } catch (error) {
        console.error("Delivery Polling Error:", error);
      } finally {
        if (isFirstLoad) setIsFirstLoad(false);
      }
    };

    if (user?.isOnline) {
      fetchOrders(); // Initial fetch when going online
      const interval = setInterval(fetchOrders, 5000);
      return () => clearInterval(interval);
    }
  }, [user?.isOnline, activeOrder, shownOrderIds]);

  // Timer logic
  useEffect(() => {
    let timer;
    if (activeOrder) {
      setTimeLeft(30);
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // Also call skip API so it doesn't immediately reappear
            skipOrder();
            toast.error("Order request timed out");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeOrder]);

  const handleAcceptOrder = async () => {
    if (!activeOrder) return;
    try {
      console.log("Delivery Alert - Accepting order:", activeOrder.id);
      await deliveryApi.acceptOrder(activeOrder.id);
      toast.success("Order accepted!");
      const orderId = activeOrder.id;
      setActiveOrder(null);
      navigate(`/delivery/order-details/${orderId}`);
    } catch (error) {
      console.error("Delivery Alert - Accept failed:", error);
      toast.error(error.response?.data?.message || "Failed to accept order");
      setActiveOrder(null);
    }
  };

  const skipOrder = async () => {
    if (activeOrder) {
      try {
        console.log("Delivery Alert - Skipping order:", activeOrder.id);
        await deliveryApi.skipOrder(activeOrder.id);
        setShownOrderIds(prev => new Set(prev).add(activeOrder.id));
        setActiveOrder(null);
        toast.info("Order skipped");
      } catch (error) {
        console.error("Delivery Alert - Skip failed:", error);
        // Even if API fails, clear it from UI to not block user
        setActiveOrder(null);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans max-w-md mx-auto relative shadow-2xl overflow-hidden border-x border-gray-100">
      {/* Status Bar / Safe Area Placeholder - Removed as it's not defined and causes spacing issues */}

      {/* Global Order Alert Modal */}
      <AnimatePresence>
        {activeOrder && (
          <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 100 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="bg-white rounded-[32px] p-6 w-full max-w-[340px] shadow-2xl border-4 border-primary/20"
            >
              <div className="flex flex-col items-center">
                <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 animate-bounce">
                  <BellRing className="h-8 w-8 text-primary" />
                </div>

                <h2 className="text-xl font-black text-slate-900 mb-1">Incoming Order!</h2>
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-2xl font-black text-green-600">₹{activeOrder.earnings}</span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-outfit">Earnings</span>
                </div>

                <div className="w-full space-y-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-1">
                      <div className="w-2 h-2 rounded-full bg-green-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Pickup</p>
                      <p className="text-sm font-bold text-slate-900">{activeOrder.pickup}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-rose-500 mt-1" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Drop</p>
                      <p className="text-sm font-bold text-slate-900 line-clamp-1">{activeOrder.drop}</p>
                    </div>
                  </div>
                </div>

                <div className="w-full h-1.5 bg-slate-100 rounded-full mb-6 overflow-hidden">
                  <motion.div
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: 30, ease: "linear" }}
                    className={timeLeft < 10 ? "bg-rose-500" : "bg-primary"}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 w-full">
                  <button
                    onClick={skipOrder}
                    className="py-4 rounded-2xl bg-slate-100 text-slate-500 font-black text-xs uppercase tracking-wider"
                  >
                    Skip
                  </button>
                  <button
                    onClick={handleAcceptOrder}
                    className="py-4 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-primary/30 active:scale-95"
                  >
                    Accept
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main
        className={`h-full min-h-screen overflow-y-auto ${shouldShowBottomNav ? "pb-24" : ""} no-scrollbar`}>
        <Outlet />
      </main>

      {shouldShowBottomNav && <BottomNav />}
      <Toaster position="top-center" />
    </div>
  );
};

export default DeliveryLayout;
