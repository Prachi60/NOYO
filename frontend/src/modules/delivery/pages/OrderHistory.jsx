import React, { useState } from "react";
import {
  Search,
  Filter,
  Calendar,
  MapPin,
  IndianRupee,
  CheckCircle,
  Clock,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/shared/components/ui/Button";
import Card from "@/shared/components/ui/Card";
import { deliveryApi } from "../services/deliveryApi";
import { toast } from "sonner";

const OrderHistory = () => {
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await deliveryApi.getOrderHistory({ status: filter });
      if (response.data.success) {
        // Handle plural 'results' from backend for array data
        setOrders(response.data.results || response.data.result || []);
      }
    } catch (error) {
      toast.error("Failed to fetch order history");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchOrders();
  }, [filter]);

  const filteredOrders = (orders || []).filter(order =>
    order.orderId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.seller?.shopName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-gray-50/50 min-h-screen pb-24">
      {/* Header */}
      <div className="bg-white shadow-sm p-4 sticky top-0 z-30 backdrop-blur-md bg-white/90">
        <h1 className="ds-h2 text-gray-900 mb-4">Order History</h1>

        {/* Search & Filter */}
        <div className="flex space-x-3 mb-4">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search Order ID, Customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all border border-transparent focus:border-primary/20"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="bg-gray-100 border-transparent hover:bg-gray-200">
            <Filter size={20} className="text-gray-600" />
          </Button>
        </div>

        {/* Status Filters */}
        <div className="flex space-x-2 overflow-x-auto pb-2 no-scrollbar">
          {["All", "Delivered", "Cancelled", "Returns"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status.toLowerCase())}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filter === status.toLowerCase()
                ? "bg-primary text-white shadow-lg shadow-primary/30 scale-105"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}>
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredOrders.length > 0 ? filteredOrders.map((order) => (
              <motion.div
                key={order._id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-bold text-gray-900 text-sm group-hover:text-primary transition-colors">
                            #{order.orderId}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${order.status === "delivered"
                              ? "bg-green-100 text-green-700"
                              : order.status === "cancelled"
                                ? "bg-red-100 text-red-700"
                                : "bg-blue-100 text-blue-700"
                              }`}>
                            {order.status}
                          </span>
                        </div>
                        <div className="flex items-center text-gray-400 text-xs">
                          <Calendar size={12} className="mr-1" />
                          {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="block font-bold text-lg text-green-600">
                          ₹{Math.round((order.pricing?.total || 0) * 0.1)}
                        </span>
                        <span className="ds-caption text-gray-400">Earnings</span>
                      </div>
                    </div>

                    <div className="border-t border-b border-gray-50 py-3 my-3 space-y-2">
                      <div className="flex items-start">
                        <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 mr-2 flex-shrink-0 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                        <div>
                          <p className="ds-caption text-gray-500 mb-0.5">Store</p>
                          <p className="text-sm font-medium text-gray-800 line-clamp-1">
                            {order.seller?.shopName || "Unknown Store"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 mr-2 flex-shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                        <div>
                          <p className="ds-caption text-gray-500 mb-0.5">
                            Customer
                          </p>
                          <p className="text-sm font-medium text-gray-800 line-clamp-1">
                            {order.customer?.name || "Customer"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <div className="flex items-center space-x-3">
                        <span className="flex items-center bg-gray-50 px-2 py-1 rounded border border-gray-100">
                          <MapPin size={12} className="mr-1 text-gray-400" />{" "}
                          2.4 km {/* Mock for now */}
                        </span>
                        <span className="flex items-center bg-gray-50 px-2 py-1 rounded border border-gray-100">
                          <Clock size={12} className="mr-1 text-gray-400" /> 15
                          min
                        </span>
                      </div>
                      <div className="flex items-center text-primary font-bold group-hover:underline">
                        View Details <ChevronRight size={14} className="ml-0.5" />
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Filter size={32} className="text-gray-400" />
                </div>
                <h3 className="ds-h3 text-gray-900">No Orders Found</h3>
                <p className="text-gray-500 text-sm">Try changing your filters.</p>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default OrderHistory;
