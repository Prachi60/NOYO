import dotenv from "dotenv";
import Order from "../models/order.js";
import Notification from "../models/notification.js";

dotenv.config();

const DEFAULT_INTERVAL_MS = 10000;
const AUTO_CANCEL_INTERVAL_MS = parseInt(
  process.env.AUTO_CANCEL_INTERVAL_MS || `${DEFAULT_INTERVAL_MS}`,
  10
);

const autoCancelExpiredOrders = async () => {
  try {
    const now = new Date();
    const expiredOrders = await Order.find({
      status: "pending",
      expiresAt: { $lte: now },
    });

    if (!expiredOrders.length) {
      return;
    }

    for (const order of expiredOrders) {
      order.status = "cancelled";
      order.cancelledBy = "system";
      order.cancelReason = "Seller timeout (60s)";
      await order.save();

      if (order.seller) {
        await Notification.create({
          recipient: order.seller,
          recipientModel: "Seller",
          title: "Order Timed Out",
          message: `Order #${order.orderId} was cancelled because it wasn't accepted within 60 seconds.`,
          type: "order",
          data: { orderId: order._id },
        });
      }
    }

    console.log(
      `[OrderAutoCancelJob] Auto-cancelled ${expiredOrders.length} expired pending orders at ${now.toISOString()}`
    );
  } catch (err) {
    console.error("[OrderAutoCancelJob] Error:", err);
  }
};

export const startOrderAutoCancelJob = () => {
  if (globalThis.__ORDER_AUTO_CANCEL_STARTED__) {
    return;
  }
  globalThis.__ORDER_AUTO_CANCEL_STARTED__ = true;

  console.log(
    `[OrderAutoCancelJob] Starting auto-cancel job with interval ${AUTO_CANCEL_INTERVAL_MS}ms`
  );

  setInterval(autoCancelExpiredOrders, AUTO_CANCEL_INTERVAL_MS);
};

export default startOrderAutoCancelJob;

