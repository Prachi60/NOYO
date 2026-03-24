import Order from "../models/order.js";
import Cart from "../models/cart.js";
import Product from "../models/product.js";
import Transaction from "../models/transaction.js";
import StockHistory from "../models/stockHistory.js";
import Notification from "../models/notification.js";
import Seller from "../models/seller.js";
import Delivery from "../models/delivery.js";
import Setting from "../models/setting.js";
import User from "../models/customer.js";
import handleResponse from "../utils/helper.js";
import getPagination from "../utils/pagination.js";

/* ===============================
   PLACE ORDER
================================ */
export const placeOrder = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { address, payment, pricing, timeSlot, items } = req.body;

    // 1. Generate unique Order ID
    const orderId = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // 2. Map items if provided, or fetch from cart if not
    let orderItems = items;
    if (!orderItems || orderItems.length === 0) {
      const cart = await Cart.findOne({ customerId }).populate(
        "items.productId",
      );
      if (!cart || cart.items.length === 0) {
        return handleResponse(res, 400, "Cannot place order with empty cart");
      }
      orderItems = cart.items.map((item) => ({
        product: item.productId._id,
        name: item.productId.name,
        quantity: item.quantity,
        price: item.productId.salePrice || item.productId.price,
        image: item.productId.mainImage,
      }));
    }

    // 3. Find seller from products (taking the first item's seller for simplicity)
    const firstProduct = await Product.findById(orderItems[0].product);
    const sellerId = firstProduct ? firstProduct.sellerId : null;
    console.log(
      `Order Placement [${orderId}] - Found Seller ID: ${sellerId} from product: ${firstProduct?.name}`,
    );

    // 3b. Normalize address.location so only valid numeric coords are stored
    let normalizedAddress = { ...address };
    if (address?.location) {
      const { lat, lng } = address.location;
      if (
        typeof lat !== "number" ||
        typeof lng !== "number" ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lng)
      ) {
        normalizedAddress = { ...address, location: undefined };
      }
    }

    // 4. Create the order
    const newOrder = new Order({
      orderId,
      customer: customerId,
      seller: sellerId,
      items: orderItems,
      address: normalizedAddress,
      payment,
      pricing,
      timeSlot: timeSlot || "now",
      status: "pending",
      expiresAt: new Date(Date.now() + 60000), // 60 seconds from now
    });

    await newOrder.save();

    // 5. Create Transaction & Stock History (Simulating immediate sale for demo)
    if (sellerId) {
      // Create pending transaction
      await Transaction.create({
        user: sellerId,
        userModel: "Seller",
        order: newOrder._id,
        type: "Order Payment",
        amount: pricing.total,
        status: "Pending",
        reference: orderId,
      });

      // Log stock history for each item
      for (const item of orderItems) {
        await StockHistory.create({
          product: item.product,
          seller: sellerId,
          type: "Sale",
          quantity: -item.quantity,
          note: `Order #${orderId}`,
          order: newOrder._id,
        });

        // Deduct actual stock
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity },
        });
      }

      // Create notification for seller
      const sellerNotif = await Notification.create({
        recipient: sellerId,
        recipientModel: "Seller",
        title: "New Order Received!",
        message: `You have received a new order #${orderId} for ₹${pricing.total}.`,
        type: "order",
        data: { orderId: newOrder._id },
      });
      console.log(
        `Order Placement [${orderId}] - Created Notification ID: ${sellerNotif._id} for Seller: ${sellerId}`,
      );
    } else {
      console.warn(
        `Order Placement [${orderId}] - WARNING: No Seller ID found, skipping notification.`,
      );
    }

    // 6. Clear the customer's cart after order is placed
    await Cart.findOneAndUpdate({ customerId }, { items: [] });

    return handleResponse(res, 201, "Order placed successfully", newOrder);
  } catch (error) {
    console.error("Place Order Error:", error);
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   GET CUSTOMER ORDERS
================================ */
export const getMyOrders = async (req, res) => {
  try {
    const customerId = req.user.id;
    const orders = await Order.find({ customer: customerId })
      .select(
        "orderId customer seller items address payment pricing status timeSlot createdAt",
      )
      .sort({ createdAt: -1 })
      .populate("items.product", "name mainImage price salePrice")
      .lean();

    return handleResponse(res, 200, "Orders fetched successfully", orders);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   GET SELLER RETURNS (Admin/Seller)
================================ */
export const getSellerReturns = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { status, startDate, endDate } = req.query;

    const query = {};

    if (role !== "admin") {
      query.seller = userId;
    }

    query.returnStatus = { $ne: "none" };

    if (status && status !== "all") {
      query.returnStatus = status;
    }

    if (startDate || endDate) {
      query.returnRequestedAt = {};
      if (startDate) {
        query.returnRequestedAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.returnRequestedAt.$lte = end;
      }
    }

    const { page, limit, skip } = getPagination(req, {
      defaultLimit: 25,
      maxLimit: 100,
    });

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ returnRequestedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("customer", "name phone")
        .populate("returnDeliveryBoy", "name phone")
        .lean(),
      Order.countDocuments(query),
    ]);

    return handleResponse(res, 200, "Seller returns fetched", {
      items: orders,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   GET ORDER DETAILS
================================ */
export const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { id: userId, role } = req.user;

    const order = await Order.findOne({ orderId })
      .populate("customer", "name email phone")
      .populate("items.product", "name mainImage price salePrice")
      .populate("deliveryBoy", "name phone")
      .populate("seller", "shopName name")
      .lean();

    if (!order) {
      return handleResponse(res, 404, "Order not found");
    }

    // --- Data Isolation Check ---
    const isOwnerCustomer =
      role === "customer" && order.customer._id.toString() === userId;
    const isOwnerSeller =
      role === "seller" && order.seller?.toString() === userId;
    const isAssignedDeliveryBoy =
      role === "delivery" && order.deliveryBoy?._id.toString() === userId;
    const isAdmin = role === "admin";

    if (
      !isOwnerCustomer &&
      !isOwnerSeller &&
      !isAssignedDeliveryBoy &&
      !isAdmin
    ) {
      return handleResponse(
        res,
        403,
        "Access denied. You are not authorized to view this order.",
      );
    }
    // -----------------------------

    return handleResponse(res, 200, "Order details fetched", order);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   CANCEL ORDER
================================ */
export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const customerId = req.user.id;

    const order = await Order.findOne({ orderId, customer: customerId });

    if (!order) {
      return handleResponse(res, 404, "Order not found");
    }

    if (order.status !== "pending") {
      return handleResponse(
        res,
        400,
        "Order cannot be cancelled after confirmation",
      );
    }

    order.status = "cancelled";
    order.cancelledBy = "customer";
    order.cancelReason = reason || "Cancelled by user";
    await order.save();

    return handleResponse(res, 200, "Order cancelled successfully", order);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   REQUEST RETURN (Customer)
================================ */
export const requestReturn = async (req, res) => {
  try {
    const { orderId } = req.params;
    const customerId = req.user.id;
    const { items, reason, images } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return handleResponse(
        res,
        400,
        "Please select at least one item to return.",
      );
    }
    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      return handleResponse(res, 400, "Return reason is required.");
    }

    const order = await Order.findOne({ orderId, customer: customerId });

    if (!order) {
      return handleResponse(res, 404, "Order not found");
    }

    if (order.status !== "delivered") {
      return handleResponse(
        res,
        400,
        "Return can only be requested for delivered orders.",
      );
    }

    if (order.returnStatus && order.returnStatus !== "none") {
      return handleResponse(
        res,
        400,
        "Return request already exists for this order.",
      );
    }

    const now = new Date();
    const deliveredAt = order.deliveredAt || order.updatedAt || order.createdAt;
    const deadline =
      order.returnDeadline ||
      new Date(deliveredAt.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (now > deadline) {
      return handleResponse(
        res,
        400,
        "Return window has expired for this order.",
      );
    }

    const selectedItems = [];
    for (const entry of items) {
      const { itemIndex, quantity } = entry || {};
      if (
        typeof itemIndex !== "number" ||
        itemIndex < 0 ||
        itemIndex >= order.items.length
      ) {
        return handleResponse(res, 400, "Invalid item selection for return.");
      }
      const original = order.items[itemIndex];
      const qty = Number(quantity) || original.quantity;
      if (qty <= 0 || qty > original.quantity) {
        return handleResponse(
          res,
          400,
          "Invalid quantity for one of the return items.",
        );
      }

      selectedItems.push({
        product: original.product,
        name: original.name,
        quantity: qty,
        price: original.price,
        variantSlot: original.variantSlot,
        itemIndex,
        status: "requested",
      });
    }

    order.returnStatus = "return_requested";
    order.returnReason = reason.trim();
    order.returnImages = Array.isArray(images) ? images.slice(0, 5) : [];
    order.returnItems = selectedItems;
    order.returnRequestedAt = now;
    order.returnDeadline = deadline;

    await order.save();

    // Basic notification for seller about new return request
    if (order.seller) {
      await Notification.create({
        recipient: order.seller,
        recipientModel: "Seller",
        title: "New Return Request",
        message: `Customer requested a return for order #${order.orderId}.`,
        type: "order",
        data: { orderId: order._id },
      });
    }

    return handleResponse(
      res,
      200,
      "Return request submitted successfully",
      order,
    );
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   GET RETURN DETAILS (Order-scoped)
================================ */
export const getReturnDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { id: userId, role } = req.user;

    const order = await Order.findOne({ orderId })
      .populate("customer", "name phone")
      .populate("seller", "shopName name")
      .populate("returnDeliveryBoy", "name phone");

    if (!order) {
      return handleResponse(res, 404, "Order not found");
    }

    const isOwnerCustomer =
      (role === "customer" || role === "user") &&
      order.customer?._id?.toString() === userId;
    const isOwnerSeller =
      role === "seller" && order.seller?._id?.toString() === userId;
    const isAssignedReturnDelivery =
      role === "delivery" &&
      order.returnDeliveryBoy?._id?.toString() === userId;
    const isAdmin = role === "admin";

    if (
      !isOwnerCustomer &&
      !isOwnerSeller &&
      !isAssignedReturnDelivery &&
      !isAdmin
    ) {
      return handleResponse(
        res,
        403,
        "Access denied. You are not authorized to view this return.",
      );
    }

    let returnDeliveryCommission = order.returnDeliveryCommission;
    if (
      returnDeliveryCommission === undefined ||
      returnDeliveryCommission === null
    ) {
      try {
        const settings = await Setting.findOne({});
        returnDeliveryCommission = settings?.returnDeliveryCommission ?? 0;
      } catch {
        returnDeliveryCommission = 0;
      }
    }

    const payload = {
      orderId: order.orderId,
      status: order.status,
      returnStatus: order.returnStatus,
      returnReason: order.returnReason,
      returnRejectedReason: order.returnRejectedReason,
      returnRequestedAt: order.returnRequestedAt,
      returnDeadline: order.returnDeadline,
      returnImages: order.returnImages || [],
      returnItems: order.returnItems || [],
      returnRefundAmount: order.returnRefundAmount,
      returnDeliveryCommission,
      returnDeliveryBoy: order.returnDeliveryBoy || null,
    };

    return handleResponse(res, 200, "Return details fetched", payload);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   UPDATE ORDER STATUS (Admin/Seller/Delivery)
================================ */
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, deliveryBoyId } = req.body;
    const { id: userId, role } = req.user;

    const order = await Order.findOne({ orderId });

    if (!order) {
      return handleResponse(res, 404, "Order not found");
    }

    // --- Data Isolation Check ---
    const isOwnerSeller =
      role === "seller" && order.seller?.toString() === userId;
    const isAssignedDeliveryBoy =
      role === "delivery" && order.deliveryBoy?.toString() === userId;
    const isAdmin = role === "admin";

    if (!isOwnerSeller && !isAssignedDeliveryBoy && !isAdmin) {
      return handleResponse(
        res,
        403,
        "Access denied. You are not authorized to update this order.",
      );
    }
    // -----------------------------

    const oldStatus = order.status;
    if (status) order.status = status;
    if (deliveryBoyId) order.deliveryBoy = deliveryBoyId;

    // Handle Cancellation (Stock Reversal & Transaction Update)
    if (status === "cancelled" && oldStatus !== "cancelled") {
      // 1. Reverse Stock
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity },
        });

        await StockHistory.create({
          product: item.product,
          seller: order.seller,
          type: "Correction",
          quantity: item.quantity,
          note: `Order #${orderId} Cancelled`,
          order: order._id,
        });
      }

      // 2. Update Transaction
      await Transaction.findOneAndUpdate(
        { reference: orderId },
        { status: "Failed" },
      );
    }

    // Handle Confirmation/Delivery (Settle Transaction for Demo)
    if (status === "delivered" && oldStatus !== "delivered") {
      order.deliveredAt = new Date();
      await Transaction.findOneAndUpdate(
        { reference: orderId, userModel: "Seller" },
        { status: "Settled" },
      );

      // Create Delivery Earning Transaction
      if (order.deliveryBoy) {
        const deliveryEarning = Math.round((order.pricing?.total || 0) * 0.1); // 10% for demo
        await Transaction.create({
          user: order.deliveryBoy,
          userModel: "Delivery",
          order: order._id,
          type: "Delivery Earning",
          amount: deliveryEarning,
          status: "Settled",
          reference: `DEL-ERN-${orderId}`,
        });

        // --- NEW: Cash Collection Logic for COD ---
        if (
          order.payment?.method?.toLowerCase() === "cash" ||
          order.payment?.method?.toLowerCase() === "cod"
        ) {
          console.log(
            "Creating Cash Collection Transaction for order:",
            orderId,
          );
          await Transaction.create({
            user: order.deliveryBoy,
            userModel: "Delivery",
            order: order._id,
            type: "Cash Collection",
            amount: order.pricing.total,
            status: "Settled", // Settled means rider has the cash
            reference: `CASH-COL-${orderId}`,
          });
        }
      }
    }

    console.log("Saving order with new status:", status);
    await order.save();

    if (status === "confirmed" && role === "seller") {
      // This order is now 'Automatic' for delivery partners
      console.log("Order confirmed, available for delivery.");
    }

    return handleResponse(res, 200, "Order status updated", order);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   APPROVE RETURN (Seller/Admin)
================================ */
export const approveReturnRequest = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { id: userId, role } = req.user;

    const order = await Order.findOne({ orderId });

    if (!order) {
      return handleResponse(res, 404, "Order not found");
    }

    const isOwnerSeller =
      role === "seller" && order.seller?.toString() === userId;
    const isAdmin = role === "admin";

    if (!isOwnerSeller && !isAdmin) {
      return handleResponse(
        res,
        403,
        "Access denied. You are not authorized to approve this return.",
      );
    }

    if (order.returnStatus !== "return_requested") {
      return handleResponse(
        res,
        400,
        "Only pending return requests can be approved.",
      );
    }

    if (!Array.isArray(order.returnItems) || order.returnItems.length === 0) {
      return handleResponse(res, 400, "No return items found for this order.");
    }

    const refundAmount = order.returnItems.reduce(
      (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
      0,
    );

    const settings = await Setting.findOne({});
    const returnCommission = settings?.returnDeliveryCommission ?? 0;

    order.returnItems = order.returnItems.map((item) => ({
      ...(item.toObject?.() ?? item),
      status: "approved",
    }));
    order.returnStatus = "return_approved";
    order.returnRefundAmount = refundAmount;
    order.returnDeliveryCommission = returnCommission;

    await order.save();

    return handleResponse(res, 200, "Return request approved", order);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   REJECT RETURN (Seller/Admin)
================================ */
export const rejectReturnRequest = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { id: userId, role } = req.user;
    const { reason } = req.body || {};

    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      return handleResponse(res, 400, "Rejection reason is required.");
    }

    const order = await Order.findOne({ orderId });

    if (!order) {
      return handleResponse(res, 404, "Order not found");
    }

    const isOwnerSeller =
      role === "seller" && order.seller?.toString() === userId;
    const isAdmin = role === "admin";

    if (!isOwnerSeller && !isAdmin) {
      return handleResponse(
        res,
        403,
        "Access denied. You are not authorized to reject this return.",
      );
    }

    if (order.returnStatus !== "return_requested") {
      return handleResponse(
        res,
        400,
        "Only pending return requests can be rejected.",
      );
    }

    order.returnStatus = "return_rejected";
    order.returnRejectedReason = reason.trim();

    await order.save();

    return handleResponse(res, 200, "Return request rejected", order);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   ASSIGN RETURN DELIVERY (Seller/Admin)
================================ */
export const assignReturnDelivery = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { id: userId, role } = req.user;
    const { deliveryBoyId } = req.body || {};

    if (!deliveryBoyId) {
      return handleResponse(res, 400, "deliveryBoyId is required.");
    }

    const order = await Order.findOne({ orderId });

    if (!order) {
      return handleResponse(res, 404, "Order not found");
    }

    const isOwnerSeller =
      role === "seller" && order.seller?.toString() === userId;
    const isAdmin = role === "admin";

    if (!isOwnerSeller && !isAdmin) {
      return handleResponse(
        res,
        403,
        "Access denied. You are not authorized to assign return pickup.",
      );
    }

    if (order.returnStatus !== "return_approved") {
      return handleResponse(
        res,
        400,
        "Return pickup can only be assigned after approval.",
      );
    }

    const partner = await Delivery.findById(deliveryBoyId);
    if (!partner) {
      return handleResponse(res, 404, "Delivery partner not found.");
    }

    order.returnDeliveryBoy = deliveryBoyId;
    order.returnStatus = "return_pickup_assigned";

    await order.save();

    await Notification.create({
      recipient: deliveryBoyId,
      recipientModel: "Delivery",
      title: "Return Pickup Assigned",
      message: `A return pickup has been assigned for order #${order.orderId}.`,
      type: "order",
      data: { orderId: order._id },
    });

    return handleResponse(
      res,
      200,
      "Return pickup assigned successfully",
      order,
    );
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

const completeReturnAndRefund = async (order) => {
  if (!order) return null;
  if (order.returnStatus === "refund_completed") {
    return order;
  }

  const refundAmount =
    order.returnRefundAmount ||
    (Array.isArray(order.returnItems)
      ? order.returnItems.reduce(
          (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
          0,
        )
      : 0);

  const commission = order.returnDeliveryCommission || 0;

  // 1. Credit customer wallet
  if (order.customer && refundAmount > 0) {
    const customer = await User.findById(order.customer);
    if (customer) {
      customer.walletBalance = (customer.walletBalance || 0) + refundAmount;
      await customer.save();

      await Transaction.create({
        user: customer._id,
        userModel: "User",
        order: order._id,
        type: "Refund",
        amount: refundAmount,
        status: "Settled",
        reference: `REF-CUST-${order.orderId}`,
      });
    }
  }

  // 2. Seller adjustment (refund + return commission)
  if (order.seller && (refundAmount > 0 || commission > 0)) {
    const adjustment = -Math.abs(refundAmount + commission);
    await Transaction.create({
      user: order.seller,
      userModel: "Seller",
      order: order._id,
      type: "Refund",
      amount: adjustment,
      status: "Settled",
      reference: `REF-SELL-${order.orderId}`,
    });
  }

  // 3. Delivery partner earning for return pickup
  if (order.returnDeliveryBoy && commission > 0) {
    await Transaction.create({
      user: order.returnDeliveryBoy,
      userModel: "Delivery",
      order: order._id,
      type: "Delivery Earning",
      amount: commission,
      status: "Settled",
      reference: `RET-DEL-${order.orderId}`,
    });
  }

  order.returnStatus = "refund_completed";
  if (order.payment) {
    order.payment.status = "refunded";
  }

  await order.save();
  return order;
};

/* ===============================
   UPDATE RETURN STATUS (Delivery/Admin)
================================ */
export const updateReturnStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { returnStatus } = req.body || {};
    const { id: userId, role } = req.user;

    if (!returnStatus) {
      return handleResponse(res, 400, "returnStatus is required.");
    }

    const order = await Order.findOne({ orderId });

    if (!order) {
      return handleResponse(res, 404, "Order not found");
    }

    const isAssignedReturnDelivery =
      role === "delivery" && order.returnDeliveryBoy?.toString() === userId;
    const isAdmin = role === "admin";

    if (!isAssignedReturnDelivery && !isAdmin) {
      return handleResponse(
        res,
        403,
        "Access denied. You are not authorized to update this return.",
      );
    }

    const oldStatus = order.returnStatus;
    const allowedStatuses = [
      "return_pickup_assigned",
      "return_in_transit",
      "returned",
    ];

    if (!allowedStatuses.includes(returnStatus)) {
      return handleResponse(res, 400, "Invalid returnStatus value.");
    }

    // Only allow forward transitions
    const orderOf = (s) =>
      s === "return_pickup_assigned"
        ? 1
        : s === "return_in_transit"
          ? 2
          : s === "returned"
            ? 3
            : 0;

    if (orderOf(returnStatus) < orderOf(oldStatus)) {
      return handleResponse(res, 400, "Return status cannot move backwards.");
    }

    const now = new Date();

    if (returnStatus === "return_in_transit") {
      order.returnStatus = "return_in_transit";
      if (!order.returnPickedAt) {
        order.returnPickedAt = now;
      }
      await order.save();
      return handleResponse(res, 200, "Return status updated", order);
    }

    if (returnStatus === "returned") {
      order.returnStatus = "returned";
      if (!order.returnDeliveredBackAt) {
        order.returnDeliveredBackAt = now;
      }
      await order.save();

      const updated = await completeReturnAndRefund(order);
      return handleResponse(
        res,
        200,
        "Return received and refund processed",
        updated,
      );
    }

    order.returnStatus = returnStatus;
    await order.save();

    return handleResponse(res, 200, "Return status updated", order);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   GET SELLER ORDERS
================================ */
export const getSellerOrders = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { startDate, endDate } = req.query;

    // If admin, fetch all orders. If seller, fetch only their orders.
    const query = role === "admin" ? {} : { seller: userId };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        // include entire end date day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }
    console.log("Fetching Orders - User role:", role, "User ID:", userId);

    const { page, limit, skip } = getPagination(req, {
      defaultLimit: 25,
      maxLimit: 100,
    });

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("customer", "name phone")
      .populate("items.product", "name mainImage price salePrice")
      .populate("deliveryBoy", "name phone")
      .populate("seller", "shopName name")
      .lean();

    const total = await Order.countDocuments(query);

    console.log("Fetched Orders Page:", page, "Count:", orders.length);

    return handleResponse(
      res,
      200,
      role === "admin" ? "All orders fetched" : "Seller orders fetched",
      {
        items: orders,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    );
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   GET AVAILABLE ORDERS (Delivery Boy)
================================ */
export const getAvailableOrders = async (req, res) => {
  try {
    const { id: userId, role } = req.user;

    if (role !== "delivery" && role !== "admin") {
      return handleResponse(
        res,
        403,
        "Access denied. Only delivery partners can view available orders.",
      );
    }

    // 1. Get delivery boy's location
    const deliveryPartner = await Delivery.findById(userId);
    if (
      !deliveryPartner ||
      !deliveryPartner.location ||
      !deliveryPartner.location.coordinates
    ) {
      return handleResponse(
        res,
        200,
        "Update your location to see nearby orders",
        [],
      );
    }

    // 2. Find nearby sellers (within 5km)
    let nearbySellers = await Seller.find({
      location: {
        $near: {
          $geometry: deliveryPartner.location,
          $maxDistance: 5000, // 5km
        },
      },
    }).select("_id");

    let sellerIds = nearbySellers.map((s) => s._id);

    // FALLBACK: If in development/testing and no nearby sellers found, show all available orders
    if (sellerIds.length === 0 && process.env.NODE_ENV !== "production") {
      console.log(
        `DEV LOG - Radius search found 0 sellers. Bypassing radius check for Delivery Partner: ${userId}`,
      );
      const allSellers = await Seller.find({}).select("_id");
      sellerIds = allSellers.map((s) => s._id);
    }

    // 3. Fetch confirmed/packed orders from these sellers with no delivery boy
    // AND exclude orders already skipped by this partner
    const maxLimit = 50;
    const requestedLimit = parseInt(req.query.limit, 10);
    const limit =
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, maxLimit)
        : 20;

    const orders = await Order.find({
      status: { $in: ["confirmed", "packed"] }, // Seller has accepted
      deliveryBoy: null,
      seller: { $in: sellerIds },
      skippedBy: { $nin: [userId] }, // Exclude if already skipped by this user
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("customer", "name phone")
      .populate("seller", "shopName address name location")
      .lean();

    console.log(
      `Delivery Partner (${userId}) - Available orders found: ${orders.length}`,
    );

    return handleResponse(
      res,
      200,
      orders.length > 0 ? "Available orders fetched" : "No orders found",
      orders,
    );
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   ACCEPT ORDER (Delivery Boy)
================================ */
export const acceptOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { id: userId, role } = req.user;

    if (role !== "delivery" && role !== "admin") {
      return handleResponse(res, 403, "Access denied.");
    }

    const order = await Order.findOne({ orderId });

    if (!order) {
      return handleResponse(res, 404, "Order not found");
    }

    if (order.deliveryBoy) {
      return handleResponse(
        res,
        400,
        "Order already assigned to another delivery partner",
      );
    }

    order.deliveryBoy = userId;
    // Optionally update status to confirmed if it was pending
    if (order.status === "pending") {
      order.status = "confirmed";
    }

    await order.save();

    // Notify Seller that a partner has been assigned
    await Notification.create({
      recipient: order.seller,
      recipientModel: "Seller",
      title: "Delivery Partner Assigned",
      message: `Delivery partner has been assigned to your order #${orderId}.`,
      type: "order",
      data: { orderId: order._id },
    });

    return handleResponse(res, 200, "Order accepted successfully", order);
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};

/* ===============================
   SKIP ORDER (Delivery Boy)
================================ */
export const skipOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { id: userId, role } = req.user;

    if (role !== "delivery" && role !== "admin") {
      return handleResponse(res, 403, "Access denied.");
    }

    const order = await Order.findOne({ orderId });

    if (!order) {
      return handleResponse(res, 404, "Order not found");
    }

    // Add user to skippedBy array if not already there
    if (!order.skippedBy.includes(userId)) {
      order.skippedBy.push(userId);
      await order.save();
    }

    return handleResponse(res, 200, "Order skipped successfully");
  } catch (error) {
    return handleResponse(res, 500, error.message);
  }
};
