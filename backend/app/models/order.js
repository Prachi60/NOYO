import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
    {
        orderId: {
            type: String,
            required: true,
            unique: true,
        },
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        seller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Seller",
            // In a multi-seller cart, this would be complex. 
            // For now, let's assume we store the primary seller or track per item.
        },
        items: [
            {
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Product",
                    required: true,
                },
                name: String,
                quantity: {
                    type: Number,
                    required: true,
                    min: 1,
                },
                price: {
                    type: Number,
                    required: true,
                },
                variantSlot: String, // To identify which variant was bought
                image: String,
            },
        ],
        address: {
            type: {
                type: String,
                enum: ["Home", "Work", "Other"],
                default: "Home",
            },
            name: String,
            address: String,
            city: String,
            phone: String,
            landmark: String,
            // Precise coordinates from checkout map (order-only; does not mutate saved addresses)
            location: {
                lat: Number,
                lng: Number,
            },
        },
        payment: {
            method: {
                type: String,
                enum: ["cash", "online", "wallet"],
                default: "cash",
            },
            status: {
                type: String,
                enum: ["pending", "completed", "failed", "refunded"],
                default: "pending",
            },
            transactionId: String,
        },
        pricing: {
            subtotal: Number,
            deliveryFee: Number,
            platformFee: Number,
            gst: Number,
            tip: {
                type: Number,
                default: 0,
            },
            discount: {
                type: Number,
                default: 0,
            },
            total: Number,
        },
        status: {
            type: String,
            enum: ["pending", "confirmed", "packed", "out_for_delivery", "delivered", "cancelled"],
            default: "pending",
        },
        timeSlot: {
            type: String,
            default: "now",
        },
        deliveryBoy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Delivery",
        },
        cancelledBy: {
            type: String,
            enum: ["customer", "seller", "admin", "system"],
        },
        cancelReason: String,
        deviceType: {
            type: String,
            enum: ["Mobile", "Desktop", "Tablet"],
            default: "Mobile",
        },
        trafficSource: {
            type: String,
            enum: ["Direct", "Search", "Social", "Referral"],
            default: "Direct",
        },
        expiresAt: {
            type: Date,
        },
        acceptedAt: {
            type: Date,
        },
        deliveredAt: {
            type: Date,
        },
        skippedBy: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Delivery",
            },
        ],

        // Return / refund lifecycle (separate from main delivery status)
        returnStatus: {
            type: String,
            enum: [
                "none",
                "return_requested",
                "return_approved",
                "return_rejected",
                "return_pickup_assigned",
                "return_in_transit",
                "returned",
                "refund_completed",
            ],
            default: "none",
        },
        returnRequestedAt: {
            type: Date,
        },
        returnDeadline: {
            type: Date,
        },
        returnReason: {
            type: String,
        },
        returnImages: [
            {
                type: String,
            },
        ],
        returnItems: [
            {
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Product",
                    required: true,
                },
                name: String,
                quantity: {
                    type: Number,
                    required: true,
                    min: 1,
                },
                price: {
                    type: Number,
                    required: true,
                },
                variantSlot: String,
                itemIndex: {
                    type: Number,
                },
                status: {
                    type: String,
                    enum: ["requested", "approved", "rejected", "returned"],
                    default: "requested",
                },
            },
        ],
        returnRejectedReason: {
            type: String,
        },
        returnDeliveryBoy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Delivery",
        },
        returnDeliveryCommission: {
            type: Number,
            default: 0,
        },
        returnRefundAmount: {
            type: Number,
            default: 0,
        },
        returnPickedAt: {
            type: Date,
        },
        returnDeliveredBackAt: {
            type: Date,
        },
    },
    { timestamps: true }
);

orderSchema.index({ status: 1, seller: 1, deliveryBoy: 1, createdAt: -1 });
orderSchema.index({ customer: 1, status: 1, createdAt: -1 });
orderSchema.index({ status: 1, expiresAt: 1 });
orderSchema.index({ seller: 1, returnStatus: 1, returnRequestedAt: -1 });

export default mongoose.model("Order", orderSchema);
