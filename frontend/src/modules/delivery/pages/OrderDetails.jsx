import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MapPin,
  Phone,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Navigation,
  Package,
  CheckCircle,
  Store,
  User,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/shared/components/ui/Button";
import Card from "@/shared/components/ui/Card";

import { toast } from "sonner";

import { deliveryApi } from "../services/deliveryApi";
import { Loader2 } from "lucide-react";

const OrderDetails = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1); // 1: Pickup, 2: At Store, 3: Delivering, 4: Delivered
  const [itemsExpanded, setItemsExpanded] = useState(false);
  const [isSlideComplete, setIsSlideComplete] = useState(false);
  const [dragX, setDragX] = useState(0);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        const response = await deliveryApi.getOrderDetails(orderId);
        const ord = response.data.result;
        setOrder(ord);

        const statusMap = {
          "confirmed": 1,
          "packed": 2,
          "out_for_delivery": 3,
          "delivered": 4
        };
        if (statusMap[ord.status]) {
          setStep(statusMap[ord.status]);
        }
      } catch (error) {
        toast.error("Failed to fetch order details");
        navigate("/delivery/dashboard");
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId, navigate]);

  const steps = [
    {
      id: 1,
      label: "Navigate to Store",
      action: "ARRIVED AT STORE",
      color: "bg-blue-600",
      bg: "bg-blue-50",
      text: "text-blue-600",
    },
    {
      id: 2,
      label: "At Store",
      action: "PICKED UP ORDER",
      color: "bg-orange-500",
      bg: "bg-orange-50",
      text: "text-orange-600",
    },
    {
      id: 3,
      label: "Start Delivery",
      action: "START DELIVERY",
      color: "bg-green-600",
      bg: "bg-green-50",
      text: "text-green-600",
    },
    {
      id: 4,
      label: "Delivering",
      action: "DELIVERED",
      color: "bg-green-700",
      bg: "bg-green-50",
      text: "text-green-700",
    },
  ];

  const handleNextStep = async () => {
    const currentStep = steps[step - 1];

    try {
      // If this is a return pickup flow, drive returnStatus instead of main status
      if (order?.returnStatus && order.returnStatus !== "none") {
        let nextReturnStatus = order.returnStatus;
        if (order.returnStatus === "return_pickup_assigned") {
          nextReturnStatus = "return_in_transit";
        } else if (order.returnStatus === "return_in_transit") {
          nextReturnStatus = "returned";
        }

        const res = await deliveryApi.updateReturnStatus(order.orderId, {
          returnStatus: nextReturnStatus,
        });
        const updated = res.data.result;
        setOrder((prev) => ({ ...(prev || {}), ...updated }));
        toast.success(`${currentStep.action} Confirmed!`);

        if (nextReturnStatus === "returned") {
          navigate("/delivery/dashboard");
        }
      } else {
        // Normal forward delivery flow (existing behavior - local step only)
        toast.success(`${currentStep.action} Confirmed!`);
        if (step < 4) {
          setStep(step + 1);
          setIsSlideComplete(false);
          setDragX(0);
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          navigate(`/delivery/confirm-delivery/${order.orderId}`);
        }
      }
    } catch (error) {
      console.error("Failed to update return status", error);
      toast.error("Failed to update status");
    }
  };

  const handleNavigate = () => {
    // When delivering (step 3-4), use order's precise coordinates if set at checkout
    if (step >= 3) {
      const loc = order?.address?.location;
      if (
        loc &&
        typeof loc.lat === "number" &&
        typeof loc.lng === "number" &&
        Number.isFinite(loc.lat) &&
        Number.isFinite(loc.lng)
      ) {
        window.open(
          `https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}`,
          "_blank",
        );
        return;
      }
    }
    // Store (step 1-2) or fallback when no coordinates
    window.open("https://maps.google.com", "_blank");
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="bg-gray-50/50 min-h-screen pb-32">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 sticky top-0 z-30 flex justify-between items-center backdrop-blur-md bg-white/90">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="mr-2">
            <ChevronDown className="rotate-90" size={24} />
          </Button>
          <h1 className="ds-h3 text-gray-800">Order #{order.orderId}</h1>
        </div>
        <div className="flex flex-col items-end">
          <span
            className={`text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide ${step === 1
              ? "bg-blue-100 text-blue-700"
              : step === 2
                ? "bg-orange-100 text-orange-700"
                : "bg-green-100 text-green-700"
              }`}>
            {step === 1 ? "Pickup" : step === 2 ? "At Store" : "Delivery"}
          </span>
          {(order.payment?.method?.toLowerCase() === 'cash' || order.payment?.method?.toLowerCase() === 'cod') && (
            <span className="mt-1 bg-orange-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-sm animate-pulse">
              COLLECT CASH: ₹{order.pricing?.total}
            </span>
          )}
        </div>
      </header>

      {/* Map Placeholder */}
      <div className="relative w-full h-48 bg-gray-200 overflow-hidden mb-4">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/90"></div>

        {/* Map Elements Simulation */}
        <div className="absolute top-1/4 left-1/4 w-32 h-1 bg-gray-300 rotate-45 rounded-full"></div>
        <div className="absolute top-1/2 right-1/4 w-40 h-2 bg-gray-300 -rotate-12 rounded-full"></div>
        <div className="absolute bottom-1/3 left-1/2 w-24 h-3 bg-gray-300 rotate-90 rounded-full"></div>

        {/* Route Line Simulation */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <path
            d="M100,80 Q180,120 250,100 T320,150"
            fill="none"
            stroke={step <= 2 ? "#f97316" : "#2563eb"}
            strokeWidth="4"
            strokeDasharray="8 4"
            className="animate-pulse"
          />
        </svg>

        {/* Markers */}
        <div className="absolute top-[70px] left-[90px] transform -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="relative">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white animate-bounce">
              <Navigation size={16} fill="currentColor" />
            </div>
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-4 h-1 bg-black/20 rounded-full blur-[1px]"></div>
          </div>
        </div>

        <div className="absolute top-[140px] right-[60px] transform -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="relative">
            <div
              className={`w-8 h-8 ${step <= 2 ? "bg-orange-500" : "bg-green-600"} rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white`}>
              {step <= 2 ? <Store size={16} /> : <User size={16} />}
            </div>
          </div>
        </div>

        <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] text-gray-500 font-bold border border-gray-200">
          Tracking View
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto -mt-6 relative z-10">
        {/* Progress Bar */}
        <Card className="p-4 border-none shadow-sm">
          <div className="flex justify-between items-center px-2 mb-2 relative">
            <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -z-10 rounded-full"></div>
            <motion.div
              className="absolute top-1/2 left-0 h-1 bg-primary -z-10 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${((step - 1) / 3) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}></motion.div>

            {[1, 2, 3, 4].map((s) => (
              <motion.div
                key={s}
                initial={false}
                animate={{
                  scale: s === step ? 1.2 : 1,
                  backgroundColor: s <= step ? "var(--primary)" : "#ffffff",
                  borderColor: s <= step ? "var(--primary)" : "#e5e7eb",
                  color: s <= step ? "#ffffff" : "#9ca3af",
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 z-10 shadow-sm`}>
                {s < step ? <CheckCircle size={16} /> : s}
              </motion.div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500 font-medium px-1">
            <span>Pickup</span>
            <span>Store</span>
            <span>Route</span>
            <span>Drop</span>
          </div>
        </Card>

        {/* Pickup Details - Active during Step 1 & 2 */}
        <AnimatePresence mode="wait">
          {step <= 2 && (
            <motion.div
              key="pickup"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, height: 0 }}>
              <Card
                className={`overflow-hidden border-l-4 border-l-orange-500 ${step > 2 ? "opacity-60" : ""}`}>
                <div className="p-4 border-b border-gray-100 bg-orange-50/50 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-2 bg-white rounded-full shadow-sm mr-3">
                      <Store className="text-orange-600" size={20} />
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-800">
                        Pickup Location
                      </h2>
                      <p className="text-xs text-orange-600 font-medium">
                        Store Location
                      </p>
                    </div>
                  </div>
                  {order.seller?.phone && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => (window.location.href = `tel:${order.seller.phone}`)}>
                      <Phone size={16} />
                    </Button>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-1">
                    {order.seller?.shopName || "Seller Store"}
                  </h3>
                  <p className="text-gray-500 text-sm mb-4 leading-relaxed">
                    {order.seller?.address || "Address not available"}
                  </p>

                  <Button
                    onClick={handleNavigate}
                    className="w-full"
                    variant="outline">
                    <Navigation size={18} className="mr-2" /> Navigate to Store
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Customer Details - Active during Step 3 & 4 */}
        <AnimatePresence mode="wait">
          {step >= 3 && (
            <motion.div
              key="customer"
              variants={containerVariants}
              initial="hidden"
              animate="visible">
              <Card className={`overflow-hidden border-l-4 border-l-blue-600`}>
                <div className="p-4 border-b border-gray-100 bg-blue-50/50 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-2 bg-white rounded-full shadow-sm mr-3">
                      <User className="text-blue-600" size={20} />
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-800">
                        Customer Details
                      </h2>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <p className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${(order.payment?.method?.toLowerCase() === 'cash' || order.payment?.method?.toLowerCase() === 'cod')
                            ? "bg-orange-50 text-orange-700 border-orange-200"
                            : "bg-green-50 text-green-700 border-green-200"
                          }`}>
                          {order.payment?.method?.toUpperCase() || "PENDING"}
                        </p>
                        <p className="text-[10px] text-gray-400 font-medium">
                          Bill: ₹{order.pricing?.total}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="icon" className="h-9 w-9">
                      <MessageSquare size={18} />
                    </Button>
                    {order.address?.phone && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => (window.location.href = `tel:${order.address.phone}`)}>
                        <Phone size={18} />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-1">{order.address?.name || "Customer"}</h3>
                  <p className="text-gray-500 text-sm mb-1">
                    {order.address?.address}
                  </p>
                  <p className="text-gray-500 text-sm mb-4">
                    {order.address?.city}
                  </p>

                  <Button
                    onClick={handleNavigate}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white border-none">
                    <Navigation size={18} className="mr-2" /> Navigate to
                    Customer
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Order Items */}
        <Card className="overflow-hidden">
          <motion.div
            className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setItemsExpanded(!itemsExpanded)}>
            <div className="flex items-center font-bold text-gray-800">
              <div className="p-2 bg-purple-100 text-purple-600 rounded-lg mr-3">
                <Package size={20} />
              </div>
              <div>
                <span>Order Items</span>
                <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {order.items?.length || 0} items
                </span>
              </div>
            </div>
            <motion.div
              animate={{ rotate: itemsExpanded ? 180 : 0 }}
              transition={{ duration: 0.3 }}>
              <ChevronDown size={20} className="text-gray-400" />
            </motion.div>
          </motion.div>

          <AnimatePresence>
            {itemsExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden">
                <div className="p-4 border-t border-gray-100 bg-gray-50/50 space-y-3">
                  {order.items?.map((item, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center text-sm">
                      <div className="flex items-center">
                        <span className="font-bold text-gray-500 mr-3 text-xs w-6 bg-white border border-gray-200 text-center rounded py-0.5">
                          x{item.quantity}
                        </span>
                        <span className="text-gray-800 font-medium">
                          {item.name}
                        </span>
                      </div>
                      <span className="font-bold text-gray-600">
                        ₹{item.price * item.quantity}
                      </span>
                    </div>
                  ))}
                  <div className="pt-3 mt-2 border-t border-gray-200 flex justify-between items-center">
                    <span className="text-gray-500 text-sm">Total Bill</span>
                    <span className="text-lg font-bold text-gray-900">
                      ₹{order.pricing?.total}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Instructions */}
        <motion.div
          className="bg-yellow-50 rounded-xl p-4 border border-yellow-200 flex items-start shadow-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}>
          <AlertTriangle
            className="text-yellow-600 mr-3 mt-0.5 flex-shrink-0"
            size={18}
          />
          <p className="text-sm text-yellow-800 leading-relaxed">
            <strong>Note:</strong> Handle eggs with care. Call customer if
            location is hard to find.
          </p>
        </motion.div>
      </div>

      {/* Sticky Action Button (Slide to Confirm) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] z-40 max-w-md mx-auto">
        <div className="relative h-16 bg-gray-100 rounded-full overflow-hidden select-none">
          {/* Background Text */}
          <motion.div
            className={`absolute inset-0 flex items-center justify-center text-gray-400 font-bold text-lg pointer-events-none transition-opacity duration-300 ${dragX > 50 ? "opacity-0" : "opacity-100"
              }`}
            animate={{ x: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}>
            Slide to {steps[step - 1].action} <ChevronRight className="ml-1" />
          </motion.div>

          {/* Progress Background */}
          <motion.div
            className={`absolute inset-y-0 left-0 ${steps[step - 1].bg} opacity-50`}
            style={{ width: dragX + 60 }}
          />

          {/* Slider Button */}
          <motion.div
            className={`absolute top-1 bottom-1 left-1 w-14 rounded-full flex items-center justify-center shadow-md cursor-grab active:cursor-grabbing z-20 ${steps[step - 1].color || "bg-primary"
              }`}
            drag="x"
            dragConstraints={{ left: 0, right: 280 }}
            dragElastic={0.05}
            dragMomentum={false}
            onDrag={(event, info) => {
              setDragX(info.point.x);
            }}
            onDragEnd={(event, info) => {
              if (info.offset.x > 150) {
                setIsSlideComplete(true);
                handleNextStep();
              } else {
                setDragX(0);
              }
            }}
            animate={{ x: isSlideComplete ? 280 : 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}>
            <ChevronRight className="text-white" size={24} />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
