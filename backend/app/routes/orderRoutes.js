import express from "express";
import {
  placeOrder,
  getMyOrders,
  getOrderDetails,
  cancelOrder,
  updateOrderStatus,
  getSellerOrders,
  getAvailableOrders,
  acceptOrder,
  skipOrder,
  requestReturn,
  getReturnDetails,
  getSellerReturns,
  approveReturnRequest,
  rejectReturnRequest,
  assignReturnDelivery,
  updateReturnStatus,
} from "../controller/orderController.js";
// Assuming there's a middleware to verify customer token
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Customer routes
router.post("/place", verifyToken, placeOrder);
router.get("/my-orders", verifyToken, getMyOrders);
router.get("/details/:orderId", verifyToken, getOrderDetails);
router.put("/cancel/:orderId", verifyToken, cancelOrder);
router.post("/:orderId/returns", verifyToken, requestReturn);
router.get("/:orderId/returns", verifyToken, getReturnDetails);

// Admin/Seller routes (might need different auth middleware for role checks)
import { allowRoles } from "../middleware/authMiddleware.js";
router.get(
  "/seller-orders",
  verifyToken,
  allowRoles("admin", "seller"),
  getSellerOrders,
);
router.put("/status/:orderId", verifyToken, updateOrderStatus);
router.get(
  "/seller-returns",
  verifyToken,
  allowRoles("admin", "seller"),
  getSellerReturns,
);
router.put(
  "/returns/:orderId/approve",
  verifyToken,
  allowRoles("admin", "seller"),
  approveReturnRequest,
);
router.put(
  "/returns/:orderId/reject",
  verifyToken,
  allowRoles("admin", "seller"),
  rejectReturnRequest,
);
router.put(
  "/returns/:orderId/assign-delivery",
  verifyToken,
  allowRoles("admin", "seller"),
  assignReturnDelivery,
);

// Delivery routes
router.get(
  "/available",
  verifyToken,
  allowRoles("admin", "delivery"),
  getAvailableOrders,
);
router.put(
  "/accept/:orderId",
  verifyToken,
  allowRoles("admin", "delivery"),
  acceptOrder,
);
router.put(
  "/skip/:orderId",
  verifyToken,
  allowRoles("admin", "delivery"),
  skipOrder,
);
router.put(
  "/return-status/:orderId",
  verifyToken,
  allowRoles("admin", "delivery"),
  updateReturnStatus,
);

export default router;
