import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import InvoiceModal from "../components/order/InvoiceModal";
import HelpModal from "../components/order/HelpModal";
import LiveTrackingMap from "../components/order/LiveTrackingMap";
import {
  ChevronLeft,
  Package,
  Truck,
  CheckCircle,
  Clock,
  MapPin,
  CreditCard,
  Download,
  HelpCircle,
  Phone,
  ArrowRight,
  User,
  Loader2,
} from "lucide-react";
import { customerApi } from "../services/customerApi";
import { toast } from "sonner";
import { subscribeToOrderLocation, subscribeToOrderTrail } from "@/core/services/trackingClient";

const OrderDetailPage = () => {
  const { orderId } = useParams();
  const [showInvoice, setShowInvoice] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [returnDetails, setReturnDetails] = useState(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [requestingReturn, setRequestingReturn] = useState(false);
  const [selectedReturnItems, setSelectedReturnItems] = useState({});
  const [returnReason, setReturnReason] = useState("");
  const [returnImages, setReturnImages] = useState([]);
  const [liveLocation, setLiveLocation] = useState(null);
  const [trail, setTrail] = useState([]);

  // Scroll to top on load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        const response = await customerApi.getOrderDetails(orderId);
        const ord = response.data.result;
        setOrder(ord);

        try {
          const retRes = await customerApi.getReturnDetails(orderId);
          setReturnDetails(retRes.data.result);
        } catch {
          setReturnDetails(null);
        }
      } catch (error) {
        console.error("Failed to fetch order details:", error);
        toast.error("Failed to load order details");
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  // Subscribe to live tracking from Firebase (if available)
  useEffect(() => {
    if (!orderId) return;

    const offLocation = subscribeToOrderLocation(orderId, setLiveLocation);
    const offTrail = subscribeToOrderTrail(orderId, setTrail);

    return () => {
      offLocation && offLocation();
      offTrail && offTrail();
    };
  }, [orderId]);

  const handleOpenInMaps = () => {
    const loc = order?.address?.location;
    const dest =
      loc &&
      typeof loc.lat === "number" &&
      typeof loc.lng === "number" &&
      Number.isFinite(loc.lat) &&
      Number.isFinite(loc.lng)
        ? loc
        : null;

    const rider =
      liveLocation &&
      typeof liveLocation.lat === "number" &&
      typeof liveLocation.lng === "number"
        ? liveLocation
        : null;

    if (rider && dest) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&origin=${rider.lat},${rider.lng}&destination=${dest.lat},${dest.lng}`,
        "_blank",
      );
      return;
    }

    if (dest) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}`,
        "_blank",
      );
      return;
    }

    window.open("https://maps.google.com", "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-green-600" size={32} />
      </div>
    );
  }

  const canRequestReturn = () => {
    if (!order) return false;
    const status = (order.status || "").toLowerCase();
    if (status !== "delivered") return false;
    if (
      returnDetails &&
      returnDetails.returnStatus &&
      returnDetails.returnStatus !== "none" &&
      returnDetails.returnStatus !== null
    ) {
      return false;
    }
    // Frontend will always allow initiating a return for delivered
    // orders without an existing return; backend can still validate
    // the actual return window and reject if it's expired.
    return true;
  };

  const toggleItemSelection = (index) => {
    setSelectedReturnItems((prev) => {
      const next = { ...prev };
      if (next[index]) {
        delete next[index];
      } else {
        next[index] = { quantity: order.items[index].quantity };
      }
      return next;
    });
  };

  const handleReturnSubmit = async () => {
    if (!order) return;
    if (!Object.keys(selectedReturnItems).length) {
      toast.error("Please select at least one item to return.");
      return;
    }
    if (!returnReason.trim()) {
      toast.error("Please provide a reason for return.");
      return;
    }

    const payload = {
      items: Object.entries(selectedReturnItems).map(([idx, val]) => ({
        itemIndex: Number(idx),
        quantity: val.quantity,
      })),
      reason: returnReason,
      images: returnImages,
    };

    try {
      setRequestingReturn(true);
      await customerApi.requestReturn(order.orderId, payload);
      toast.success("Return request submitted");
      setShowReturnModal(false);
      setSelectedReturnItems({});
      setReturnReason("");
      setReturnImages([]);

      const [orderRes, retRes] = await Promise.all([
        customerApi.getOrderDetails(orderId),
        customerApi.getReturnDetails(orderId),
      ]);
      setOrder(orderRes.data.result);
      setReturnDetails(retRes.data.result);
    } catch (error) {
      console.error("Failed to submit return request", error);
      toast.error(
        error.response?.data?.message || "Failed to submit return request",
      );
    } finally {
      setRequestingReturn(false);
    }
  };

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Package size={64} className="text-gray-300 mb-4" />
        <h3 className="text-lg font-bold text-gray-800">Order not found</h3>
        <Link to="/orders" className="text-green-600 font-bold mt-4">
          Back to my orders
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans">
      {/* Header */}
      <div className="bg-white sticky top-0 z-30 px-4 py-4 flex items-center gap-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
        <Link
          to="/orders"
          className="p-2 rounded-full hover:bg-slate-100 transition-colors">
          <ChevronLeft size={24} className="text-slate-800" />
        </Link>
        <div>
          <h1 className="text-lg font-black text-slate-800">Order Details</h1>
          <p className="text-xs text-slate-500 font-medium">#{order.orderId}</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
        {/* Live Tracking Map */}
        <div className="rounded-3xl overflow-hidden shadow-sm border border-slate-100">
          <LiveTrackingMap
            status={order.status}
            eta={order.status === "delivered" ? "Arrived" : "8 mins"}
            riderName={order.deliveryBoy?.name || "Delivery Partner"}
            riderLocation={liveLocation}
            destinationLocation={order.address?.location || null}
            onOpenInMaps={handleOpenInMaps}
          />
        </div>

        {/* Items List */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-black text-slate-800 mb-4 px-1 flex items-center gap-2">
            <Package size={20} className="text-slate-400" />
            Items in this Order
          </h3>
          <div className="divide-y divide-slate-50">
            {order.items.map((item, idx) => (
              <div
                key={idx}
                className="py-4 flex items-center gap-4 first:pt-0 last:pb-0 hover:bg-slate-50/50 rounded-xl transition-colors px-2 -mx-2">
                <div className="h-16 w-16 bg-slate-50 rounded-xl overflow-hidden flex-shrink-0 border border-slate-100">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800 text-sm mb-1">
                    {item.name}
                  </h4>
                  <p className="text-slate-500 text-xs font-medium">
                    {item.quantity} quantity
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-800">
                    ₹{item.price * item.quantity}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bill Details */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-black text-slate-800 mb-4 px-1">
            Bill Details
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-slate-500 font-medium px-2">
              <span>Item Total</span>
              <span>₹{order.pricing.subtotal}</span>
            </div>
            <div className="flex justify-between text-slate-500 font-medium px-2">
              <span>Delivery Fee</span>
              <span
                className={
                  order.pricing.deliveryFee === 0 ? "text-[#45B0E2]" : ""
                }>
                {order.pricing.deliveryFee === 0
                  ? "FREE"
                  : `₹${order.pricing.deliveryFee}`}
              </span>
            </div>
            <div className="flex justify-between text-slate-500 font-medium px-2">
              <span>GST</span>
              <span>₹{order.pricing.gst}</span>
            </div>
            {order.pricing.tip > 0 && (
              <div className="flex justify-between text-slate-500 font-medium px-2">
                <span>Tip</span>
                <span>₹{order.pricing.tip}</span>
              </div>
            )}
            <div className="border-t border-slate-100 mt-4 pt-4 flex justify-between items-center px-2">
              <span className="text-lg font-black text-slate-800">
                Grand Total
              </span>
              <span className="text-2xl font-black text-[#45B0E2]">
                ₹{order.pricing.total}
              </span>
            </div>
          </div>
          <div className="mt-6 bg-green-50 rounded-2xl p-4 flex items-center justify-between border border-green-100 border-dashed">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center text-[#45B0E2] shadow-sm">
                <CreditCard size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#45B0E2] uppercase tracking-wider">
                  Payment Method
                </span>
                <span className="text-sm font-bold text-slate-800 truncate max-w-[150px]">
                  {order.payment.method === "cash"
                    ? "Cash on Delivery"
                    : order.payment.method}
                </span>
              </div>
            </div>
            <span className="text-[10px] bg-white px-2 py-1 rounded-md text-slate-500 font-mono shadow-sm border border-green-100">
              {order.payment.transactionId || "N/A"}
            </span>
          </div>
        </div>

        {/* Return Status */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-black text-slate-800 mb-3 px-1">
            Return & Refund
          </h3>
          {returnDetails &&
          returnDetails.returnStatus &&
          returnDetails.returnStatus !== "none" ? (
            <div className="space-y-2 text-sm">
              <p className="font-bold text-slate-700">
                Status:{" "}
                <span className="uppercase text-xs font-black px-2 py-1 rounded-md bg-slate-100 text-slate-800">
                  {returnDetails.returnStatus.replace(/_/g, " ")}
                </span>
              </p>
              {returnDetails.returnStatus === "return_rejected" && (
                <p className="text-sm text-rose-600 font-medium">
                  Return request rejected:{" "}
                  {returnDetails.returnRejectedReason || "No reason provided"}
                </p>
              )}
              {returnDetails.returnRefundAmount > 0 &&
                returnDetails.returnStatus === "refund_completed" && (
                  <p className="text-sm text-emerald-700 font-semibold">
                    ₹{returnDetails.returnRefundAmount} has been added to your
                    wallet for future purchases.
                  </p>
                )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              No return requested for this order.
            </p>
          )}
          {canRequestReturn() && (
            <button
              onClick={() => setShowReturnModal(true)}
              className="mt-4 inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold shadow-sm hover:bg-slate-800">
              Request Return
            </button>
          )}
        </div>

        {/* Address & Actions */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-black text-slate-800 mb-4 px-1">
            Delivery Details
          </h3>
          <div className="flex gap-4 p-2">
            <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 flex-shrink-0">
              <MapPin size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-bold text-slate-800">
                  {order.address.type}
                </h4>
                <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase">
                  {order.address.name}
                </span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed font-medium max-w-xs">
                {order.address.address}, {order.address.city}
              </p>
              {order.address?.location &&
                typeof order.address.location.lat === "number" &&
                typeof order.address.location.lng === "number" && (
                  <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                    <CheckCircle size={12} className="text-emerald-600" />
                    Precise location used for delivery
                  </p>
                )}
              <p className="text-sm text-slate-800 font-bold mt-2 flex items-center gap-2">
                <Phone size={14} className="text-slate-400" />{" "}
                {order.address.phone}
              </p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowInvoice(true)}
              className="py-3.5 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 text-sm">
              <Download size={18} /> Download Invoice
            </button>
            <button
              onClick={() => setShowHelp(true)}
              className="py-3.5 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 text-sm">
              <HelpCircle size={18} /> Need Help?
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <InvoiceModal
        isOpen={showInvoice}
        onClose={() => setShowInvoice(false)}
        order={order}
      />
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />

      {/* Return Request Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !requestingReturn && setShowReturnModal(false)}
          />
          <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-xl p-6 space-y-4">
            <h3 className="text-lg font-black text-slate-900">
              Request Return
            </h3>
            <p className="text-xs text-slate-500">
              Select the items you want to return and tell us why.
            </p>
            <div className="max-h-48 overflow-y-auto space-y-3">
              {order.items.map((item, idx) => {
                const checked = !!selectedReturnItems[idx];
                return (
                  <label
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleItemSelection(idx)}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800">
                        {item.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        Qty: {item.quantity} • ₹{item.price * item.quantity}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600">
                Reason for return
              </label>
              <textarea
                rows={3}
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
                placeholder="Describe the issue with the product..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => !requestingReturn && setShowReturnModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100"
                disabled={requestingReturn}>
                Cancel
              </button>
              <button
                onClick={handleReturnSubmit}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-70"
                disabled={requestingReturn}>
                {requestingReturn ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetailPage;
