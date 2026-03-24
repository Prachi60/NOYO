import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Navigation,
  Phone,
  MessageSquare,
  Shield,
  Clock,
  Star,
  Search,
} from "lucide-react";

const SEARCHING_STATUSES = ["pending", "confirmed"];

const LiveTrackingMap = ({
  status = "out for delivery",
  eta = "8 mins",
  riderName = "Ramesh Kumar",
  riderLocation,
  destinationLocation,
  onOpenInMaps,
}) => {
  const isSearching = SEARCHING_STATUSES.includes(status?.toLowerCase());
  const [progress, setProgress] = useState(0);
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => (prev + 0.5) % 100);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isSearching) return;
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, [isSearching]);

  // ─── SEARCHING STATE ───────────────────────────────────────────────────
  if (isSearching) {
    return (
      <div className="relative w-full h-[320px] bg-gradient-to-br from-[#f0faf4] to-[#e8f5e9] overflow-hidden rounded-b-[2rem] flex flex-col items-center justify-center gap-4">
        {/* Animated radar rings */}
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border-2 border-[#45B0E2]/20"
            initial={{ width: 60, height: 60, opacity: 0.8 }}
            animate={{ width: 60 + i * 70, height: 60 + i * 70, opacity: 0 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeOut",
            }}
          />
        ))}

        {/* Center dot */}
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="relative z-10 h-16 w-16 bg-[#45B0E2] rounded-full flex items-center justify-center shadow-xl shadow-green-200">
          <Search size={28} className="text-white" />
        </motion.div>

        {/* Text */}
        <div className="relative z-10 text-center px-6">
          <h3 className="text-lg font-black text-gray-800">
            Searching for delivery partner{dots}
          </h3>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Hang tight! We're finding the best rider near you.
          </p>
        </div>

        {/* Status pill */}
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="relative z-10 bg-white px-4 py-2 rounded-full shadow-md border border-green-100 flex items-center gap-2">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
            {status === "confirmed"
              ? "Order Confirmed · Assigning Rider"
              : "Order Placed · Finding Rider"}
          </span>
        </motion.div>
      </div>
    );
  }

  // ─── LIVE TRACKING STATE ───────────────────────────────────────────────
  return (
    <div className="relative w-full h-[350px] bg-[#E5E3DF] overflow-hidden rounded-b-[2rem] shadow-md border-b border-gray-200">
      {/* 1. Map Background Layer (Simulated Google Maps Style) */}
      <div className="absolute inset-0 opacity-60">
        <div className="absolute w-full h-full bg-[repeating-linear-gradient(90deg,transparent,transparent_49px,#fff_50px),repeating-linear-gradient(0deg,transparent,transparent_49px,#fff_50px)] bg-[length:50px_50px]" />
        <div className="absolute w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_100px,#ffffff80_100px)]" />

        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 400 350"
          preserveAspectRatio="none">
          <path
            d="M-10,100 Q150,120 200,80 T450,150"
            fill="none"
            stroke="white"
            strokeWidth="12"
          />
          <path
            d="M200,0 L200,400"
            fill="none"
            stroke="white"
            strokeWidth="15"
          />
          <path
            d="M50,350 Q100,200 400,250"
            fill="none"
            stroke="white"
            strokeWidth="10"
          />
          <motion.path
            d="M200,20 Q210,100 180,180"
            fill="none"
            stroke="#0F9D58"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="5 5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </svg>
      </div>

      {/* 2. Map Elements (Pins & Rider) */}
      <div className="absolute inset-0 z-10">
        {/* Store Location (Start) */}
        <div className="absolute top-[5%] left-[50%] -translate-x-1/2 flex flex-col items-center">
          <div className="bg-white p-1 rounded-full shadow-md">
            <div className="h-2 w-2 bg-black rounded-full" />
          </div>
        </div>

        {/* Home Location (End) */}
        <div className="absolute top-[50%] left-[45%] flex flex-col items-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="relative">
            <div className="h-10 w-10 bg-[#45B0E2] rounded-full flex items-center justify-center shadow-lg border-2 border-white text-white z-20 relative">
              <HomeIcon size={18} fill="currentColor" />
            </div>
            <div className="absolute inset-0 bg-[#45B0E2] rounded-full animate-ping opacity-20" />
          </motion.div>
          <div className="bg-white px-2 py-1 rounded-md shadow-sm mt-1 border border-gray-100">
            <p className="text-[10px] font-bold text-gray-800">Home</p>
          </div>
        </div>

        {/* Moving Rider */}
        <motion.div
          className="absolute z-30"
          animate={{
            top: ["5%", "20%", "35%", "48%"],
            left: ["50%", "52%", "48%", "45%"],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}>
          <div className="relative">
            <div className="bg-white p-1.5 rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.2)] border-2 border-white z-20">
              <div className="h-8 w-8 bg-[#45B0E2] rounded-full flex items-center justify-center">
                <Navigation
                  size={18}
                  className="text-white fill-current rotate-180"
                />
              </div>
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[20px] border-t-[#45B0E2]/20 blur-sm -mt-1" />
          </div>
          <div className="absolute -right-20 top-0 bg-white px-2 py-1 rounded-lg shadow-md border border-gray-100 flex items-center gap-1">
            <span className="text-[10px] font-bold text-gray-800">
              {riderName}
            </span>
          </div>
        </motion.div>
      </div>

      {/* 3. Floating Overlay Cards */}
      <div className="absolute top-4 left-4 right-4 z-40 flex justify-between items-start">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/90 backdrop-blur-md rounded-2xl p-3 shadow-lg border border-white/50 flex items-center gap-3">
          <div className="h-10 w-10 bg-green-50 rounded-xl flex items-center justify-center text-[#45B0E2]">
            <Clock size={20} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Arriving in
            </p>
            <h2 className="text-xl font-black text-gray-900 leading-none">
              {eta}
            </h2>
          </div>
        </motion.div>
        <button
          type="button"
          className="bg-white/90 backdrop-blur-md rounded-full px-3 py-2 shadow-lg border border-white/50 cursor-pointer hover:bg-white transition-colors flex items-center gap-1.5 text-[10px] font-bold text-slate-700"
          onClick={() => {
            if (typeof onOpenInMaps === "function") {
              onOpenInMaps({ riderLocation, destinationLocation });
            }
          }}
        >
          <MapPin size={14} className="text-[#45B0E2]" />
          Open in Maps
        </button>
      </div>

      {/* 4. Rider Info Card (Bottom Floating) */}
      <div className="absolute bottom-4 left-4 right-4 z-40">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white rounded-[20px] p-4 shadow-xl border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-12 w-12 rounded-full bg-gray-100 overflow-hidden border-2 border-white shadow-sm">
                <img
                  src="https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&auto=format&fit=crop&q=60"
                  alt="Rider"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full">
                <div className="bg-[#45B0E2] text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  4.8 <Star size={6} fill="white" />
                </div>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-sm">{riderName}</h3>
              <p className="text-xs text-gray-500">
                Vaccinated • English, Hindi
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center text-[#45B0E2] hover:bg-green-100 transition-colors">
                <Phone size={18} />
              </button>
              <button className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 hover:bg-blue-100 transition-colors">
                <MessageSquare size={18} />
              </button>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-50">
            <p className="text-[10px] text-gray-400 text-center flex items-center justify-center gap-1.5">
              <Shield size={10} />
              Rider temperature checked: 98.4°F
            </p>
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-20 left-2 opacity-50 pointer-events-none">
        <span className="text-[10px] font-medium text-gray-500">Google</span>
      </div>
    </div>
  );
};

const HomeIcon = ({ size, fill }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill || "none"}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
);

export default LiveTrackingMap;
