import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle,
  Camera,
  IndianRupee,
  ArrowRight,
  ShieldCheck,
  Home,
} from "lucide-react";
import { motion } from "framer-motion";
import Button from "@/shared/components/ui/Button";
import Card from "@/shared/components/ui/Card";
import confetti from "canvas-confetti";

import { useParams } from "react-router-dom";
import { deliveryApi } from "../services/deliveryApi";
import { toast } from "sonner";

const DeliveryConfirmation = () => {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [cashCollected, setCashCollected] = useState("");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const res = await deliveryApi.getOrderDetails(orderId);
        if (res.data.success) {
          setOrder(res.data.result);
        }
      } catch (error) {
        toast.error("Failed to load order details");
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  const handleComplete = async () => {
    try {
      setSubmitting(true);
      const res = await deliveryApi.updateOrderStatus(orderId, { status: 'delivered' });

      if (res.data.success) {
        setIsCompleted(true);
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#22c55e", "#3b82f6", "#f59e0b"],
        });

        setTimeout(() => {
          navigate("/delivery/dashboard");
        }, 2500);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to complete delivery");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 3) {
      document.getElementById(`conf-otp-${index + 1}`).focus();
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const orderAmount = order?.pricing?.total || 0;
  const isPrepaid = order?.payment?.method?.toLowerCase() !== 'cash' && order?.payment?.method?.toLowerCase() !== 'cod';

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="bg-white rounded-full p-6 shadow-xl mb-6">
          <CheckCircle className="text-green-500 w-24 h-24" strokeWidth={1.5} />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-bold text-gray-900 mb-2">
          Delivery Successful!
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-gray-500 mb-8">
          Order #{orderId} has been delivered.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}>
          <Button
            onClick={() => navigate("/delivery/dashboard")}
            className="px-8">
            Back to Dashboard
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50/50 min-h-screen flex flex-col p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 pt-2">
        <h1 className="ds-h2 text-gray-900">Confirm Delivery</h1>
        <div className="text-xs font-bold text-gray-400">Order: #{orderId}</div>
      </div>

      <div className="flex-1 space-y-6 max-w-lg mx-auto w-full">
        {/* Payment Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}>
          <Card
            className={`p-6 border-l-4 ${isPrepaid ? "border-l-green-500 bg-green-50/30" : "border-l-orange-500 bg-orange-50/30"}`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                  {isPrepaid ? "Payment Status" : "Amount to Collect"}
                </p>
                <h2
                  className={`text-4xl font-extrabold ${isPrepaid ? "text-green-600" : "text-orange-600"}`}>
                  {isPrepaid ? "PAID" : `₹${orderAmount}`}
                </h2>
              </div>
              <div
                className={`p-3 rounded-full ${isPrepaid ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"}`}>
                {isPrepaid ? (
                  <CheckCircle size={32} />
                ) : (
                  <IndianRupee size={32} />
                )}
              </div>
            </div>

            {!isPrepaid && (
              <div className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cash Received
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-gray-500 sm:text-sm font-bold">
                      ₹
                    </span>
                  </div>
                  <input
                    type="number"
                    className="block w-full rounded-lg border-gray-300 pl-8 pr-4 py-3 focus:border-orange-500 focus:ring-orange-500 text-lg font-bold bg-gray-50 focus:bg-white transition-all outline-none"
                    placeholder="0.00"
                    value={cashCollected}
                    onChange={(e) => setCashCollected(e.target.value)}
                  />
                </div>
                {Number(cashCollected) > orderAmount && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-3 p-2 bg-green-50 border border-green-100 rounded-lg text-sm text-green-700 font-medium flex items-center">
                    <CheckCircle size={16} className="mr-2" />
                    Return Change:{" "}
                    <span className="font-bold ml-1">
                      ₹{Number(cashCollected) - orderAmount}
                    </span>
                  </motion.div>
                )}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Security OTP */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}>
          <Card className="p-6">
            <div className="flex items-center mb-4 text-gray-800">
              <ShieldCheck className="mr-2 text-primary" size={24} />
              <h3 className="font-bold text-lg">Delivery OTP</h3>
            </div>
            <p className="text-gray-500 text-sm mb-4">
              Ask customer for the 4-digit code.
            </p>

            <div className="flex justify-between gap-3">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`conf-otp-${index}`}
                  type="tel"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  className="w-14 h-16 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all bg-gray-50 text-gray-900"
                />
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Proof of Delivery (Optional) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}>
          <Card className="p-0 overflow-hidden">
            <button className="w-full p-4 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors">
              <Camera size={32} className="mb-2 text-gray-400" />
              <span className="font-medium text-sm">
                Upload Photo Proof (Optional)
              </span>
            </button>
          </Card>
        </motion.div>
      </div>

      {/* Action Button */}
      <motion.div whileTap={{ scale: 0.98 }} className="mt-6 max-w-lg mx-auto w-full">
        <Button
          onClick={handleComplete}
          disabled={
            submitting ||
            (!isPrepaid && Number(cashCollected) < orderAmount) ||
            otp.some((d) => !d)
          }
          className={`w-full py-6 text-lg shadow-lg ${submitting ||
            (!isPrepaid && Number(cashCollected) < orderAmount) ||
            otp.some((d) => !d)
            ? ""
            : "shadow-green-600/30 bg-green-600 hover:bg-green-700"
            }`}>
          {submitting ? "COMPLETING..." : "Complete Delivery"} <CheckCircle className="ml-2 h-6 w-6" />
        </Button>
      </motion.div>
    </div >
  );
};

export default DeliveryConfirmation;
