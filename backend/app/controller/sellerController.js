import Seller from "../models/seller.js";
import Transaction from "../models/transaction.js";
import handleResponse from "../utils/helper.js";
import mongoose from "mongoose";

/* ===============================
   REQUEST WITHDRAWAL (Seller)
================================ */
export const requestWithdrawal = async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return handleResponse(res, 400, "Please enter a valid amount");
        }

        // 1. Calculate current available balance
        // Consistent with getSellerEarnings logic in sellerStatsController.js
        const transactions = await Transaction.find({ user: sellerId, userModel: 'Seller' })
            .select("status amount type")
            .lean();

        const settledBalance = transactions
            .filter(t => t.status === 'Settled')
            .reduce((acc, t) => acc + (t.amount || 0), 0);

        const pendingPayouts = transactions
            .filter(t => t.type === 'Withdrawal' && (t.status === 'Pending' || t.status === 'Processing'))
            .reduce((acc, t) => acc + Math.abs(t.amount || 0), 0);

        const availableBalance = settledBalance - pendingPayouts;

        if (amount > availableBalance) {
            return handleResponse(res, 400, `Insufficient balance. Available: ₹${availableBalance}`);
        }

        // 2. Create Withdrawal Transaction
        // Withdrawals have negative amounts per the model comment
        const withdrawal = await Transaction.create({
            user: sellerId,
            userModel: "Seller",
            type: "Withdrawal",
            amount: -Math.abs(amount),
            status: "Pending",
            reference: `WDR-${Date.now()}`
        });

        return handleResponse(res, 201, "Withdrawal request submitted successfully", withdrawal);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

/* ===============================
   GET SELLER PROFILE
================================ */
export const getSellerProfile = async (req, res) => {
    try {
        const seller = await Seller.findById(req.user.id);
        if (!seller) {
            return handleResponse(res, 404, "Seller not found");
        }
        return handleResponse(res, 200, "Seller profile fetched successfully", seller);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

/* ===============================
   UPDATE SELLER PROFILE
================================ */
export const updateSellerProfile = async (req, res) => {
    try {
        const { name, shopName, phone } = req.body;

        // Find seller
        const seller = await Seller.findById(req.user.id);
        if (!seller) {
            return handleResponse(res, 404, "Seller not found");
        }

        // Update fields if provided
        if (name) seller.name = name;
        if (shopName) seller.shopName = shopName;
        if (phone) seller.phone = phone;

        const updatedSeller = await seller.save();

        return handleResponse(res, 200, "Profile updated successfully", updatedSeller);
    } catch (error) {
        // Handle duplicate phone error
        if (error.code === 11000) {
            return handleResponse(res, 400, "Phone number already in use");
        }
        return handleResponse(res, 500, error.message);
    }
};
