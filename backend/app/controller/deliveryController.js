import Order from "../models/order.js";
import Transaction from "../models/transaction.js";
import Delivery from "../models/delivery.js";
import handleResponse from "../utils/helper.js";
import mongoose from "mongoose";
import { writeDeliveryLocation, appendTrailPoint } from "../services/firebaseService.js";

/* ===============================
   GET DELIVERY DASHBOARD STATS
================================ */
export const getDeliveryStats = async (req, res) => {
    try {
        const deliveryBoyId = new mongoose.Types.ObjectId(req.user.id);
        console.log(`[Stats] Fetching for Partner: ${deliveryBoyId}`);

        const orders = await Order.find({ deliveryBoy: deliveryBoyId, status: 'delivered' });
        const totalDeliveries = orders.length;
        console.log(`[Stats] Delivered Orders found: ${totalDeliveries}`);

        // Today's earnings - Using a more robust date check
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const allTransactions = await Transaction.find({
            user: deliveryBoyId,
            userModel: 'Delivery',
            createdAt: { $gte: startOfToday }
        });

        console.log(`Found ${allTransactions.length} transactions for today for user ${deliveryBoyId}`);

        const todayEarnings = allTransactions
            .filter(t => t.status === 'Settled' && (t.type === 'Delivery Earning' || t.type === 'Incentive' || t.type === 'Bonus'))
            .reduce((acc, t) => acc + t.amount, 0);

        const incentives = allTransactions
            .filter(t => t.status === 'Settled' && (t.type === 'Incentive' || t.type === 'Bonus'))
            .reduce((acc, t) => acc + t.amount, 0);

        // All-time cash collected logic
        const cashTransactions = await Transaction.find({
            user: deliveryBoyId,
            userModel: 'Delivery',
            type: { $in: ['Cash Collection', 'Cash Settlement'] }
        });

        console.log(`Found ${cashTransactions.length} cash transactions for user ${deliveryBoyId}`);

        const cashCollected = cashTransactions.reduce((acc, t) => {
            return t.type === 'Cash Collection' ? acc + t.amount : acc - Math.abs(t.amount);
        }, 0);

        return handleResponse(res, 200, "Stats fetched", {
            today: todayEarnings,
            deliveries: totalDeliveries,
            incentives,
            cashCollected
        });
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

/* ===============================
   GET DELIVERY EARNINGS
================================ */
export const getDeliveryEarnings = async (req, res) => {
    try {
        const deliveryBoyId = new mongoose.Types.ObjectId(req.user.id);
        const transactions = await Transaction.find({ user: deliveryBoyId, userModel: 'Delivery' })
            .sort({ createdAt: -1 })
            .populate("order", "orderId pricing");

        const totalEarnings = transactions
            .filter(t => t.status === 'Settled' && (t.type === 'Delivery Earning' || t.type === 'Incentive' || t.type === 'Bonus'))
            .reduce((acc, t) => acc + t.amount, 0);

        const onlinePay = transactions
            .filter(t => t.type === 'Delivery Earning' && t.status === 'Settled')
            .reduce((acc, t) => acc + t.amount, 0);

        const incentives = transactions
            .filter(t => (t.type === 'Incentive' || t.type === 'Bonus') && t.status === 'Settled')
            .reduce((acc, t) => acc + t.amount, 0);

        // Calculate Real Cash Collected
        const cashTransactions = transactions.filter(t => t.status === 'Settled' && (t.type === 'Cash Collection' || t.type === 'Cash Settlement'));
        const cashCollected = cashTransactions.reduce((acc, t) => {
            return t.type === 'Cash Collection' ? acc + t.amount : acc - Math.abs(t.amount);
        }, 0);

        // Last 7 days aggregation for chart
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const dailyAggregation = await Transaction.aggregate([
            {
                $match: {
                    user: deliveryBoyId,
                    userModel: 'Delivery',
                    status: 'Settled',
                    createdAt: { $gte: sevenDaysAgo },
                    type: { $in: ['Delivery Earning', 'Incentive', 'Bonus'] }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    amount: { $sum: "$amount" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const chartData = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const foundAt = dailyAggregation.find(a => a._id === dateStr);
            chartData.push({
                name: dayNames[d.getDay()],
                earnings: foundAt ? foundAt.amount : 0,
                incentives: 0 // Could be further aggregated if needed
            });
        }

        return handleResponse(res, 200, "Earnings fetched", {
            totalEarnings,
            onlinePay,
            incentives,
            cashCollected,
            chartData,
            transactions: transactions.slice(0, 20)
        });
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

/* ===============================
   GET DELIVERY ORDER HISTORY
================================ */
export const getMyDeliveryOrders = async (req, res) => {
    try {
        const deliveryBoyId = new mongoose.Types.ObjectId(req.user.id);
        const { status } = req.query;

        let query = { deliveryBoy: deliveryBoyId };
        if (status && status !== 'all') {
            query.status = status;
        }

        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .populate("seller", "shopName address")
            .populate("customer", "name phone");

        return handleResponse(res, 200, "Delivery orders fetched", orders);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

/* ===============================
   REQUEST WITHDRAWAL (Delivery)
================================ */
export const requestWithdrawal = async (req, res) => {
    try {
        const deliveryBoyId = req.user.id;
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return handleResponse(res, 400, "Please enter a valid amount");
        }

        // 1. Calculate current available balance
        const transactions = await Transaction.find({ user: deliveryBoyId, userModel: 'Delivery' });

        const settledBalance = transactions
            .filter(t => t.status === 'Settled')
            .reduce((acc, t) => acc + t.amount, 0);

        const pendingPayouts = transactions
            .filter(t => (t.status === 'Pending' || t.status === 'Processing') && t.type === 'Withdrawal')
            .reduce((acc, t) => acc + Math.abs(t.amount), 0);

        const availableBalance = settledBalance - pendingPayouts;

        if (amount > availableBalance) {
            return handleResponse(res, 400, `Insufficient balance. Available: ₹${availableBalance}`);
        }

        // 2. Create Withdrawal Transaction
        const withdrawal = await Transaction.create({
            user: deliveryBoyId,
            userModel: "Delivery",
            type: "Withdrawal",
            amount: -Math.abs(amount),
            status: "Pending",
            reference: `WDR-DL-${Date.now()}`
        });

        return handleResponse(res, 201, "Withdrawal request submitted successfully", withdrawal);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

/* ===============================
   UPDATE LIVE LOCATION (Delivery)
================================ */
export const updateDeliveryLocation = async (req, res) => {
    try {
        const deliveryId = req.user.id;
        const { lat, lng, accuracy, heading, speed, orderId } = req.body || {};

        if (
            typeof lat !== "number" ||
            typeof lng !== "number" ||
            Number.isNaN(lat) ||
            Number.isNaN(lng)
        ) {
            return handleResponse(res, 400, "Valid numeric lat and lng are required");
        }

        // Normalize to [lng, lat] as required by GeoJSON
        const coordinates = [Number(lng), Number(lat)];

        const delivery = await Delivery.findByIdAndUpdate(
            deliveryId,
            {
                $set: {
                    location: {
                        type: "Point",
                        coordinates,
                    },
                    lastLocationAt: new Date(),
                },
            },
            { new: true }
        ).select("_id location isOnline");

        if (!delivery) {
            return handleResponse(res, 404, "Delivery partner not found");
        }

        // Optional: if orderId is provided, ensure this rider is assigned to that order
        let activeOrderId = orderId || null;
        if (orderId) {
            const order = await Order.findOne({ orderId }).select("orderId deliveryBoy status");
            if (!order || order.deliveryBoy?.toString() !== deliveryId) {
                activeOrderId = null;
            }
        }

        const snapshot = {
            lat,
            lng,
            accuracy: typeof accuracy === "number" ? accuracy : undefined,
            heading: typeof heading === "number" ? heading : undefined,
            speed: typeof speed === "number" ? speed : undefined,
            lastUpdatedAt: new Date().toISOString(),
            deliveryId,
            orderId: activeOrderId,
        };

        // Fan out to Firebase (no-op until fully wired) and keep a short trail
        await writeDeliveryLocation(deliveryId, activeOrderId, snapshot);
        if (activeOrderId) {
            await appendTrailPoint(activeOrderId, {
                lat,
                lng,
                t: Date.now(),
            });
        }

        return handleResponse(res, 200, "Location updated", {
            location: delivery.location,
            activeOrderId,
        });
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

