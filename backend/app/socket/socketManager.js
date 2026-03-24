/**
 * socketManager.js
 * Central Socket.IO manager — stores the io instance and connected delivery partner sockets.
 */

let _io = null;

// Map: deliveryPartnerId (string) → socketId
const deliverySockets = new Map();

export const initSocket = (io) => {
    _io = io;

    io.on('connection', (socket) => {
        console.log(`[Socket] New connection: ${socket.id}`);

        // Delivery partner registers himself with his userId
        socket.on('register_delivery', (deliveryId) => {
            if (deliveryId) {
                deliverySockets.set(deliveryId.toString(), socket.id);
                console.log(`[Socket] Delivery partner registered: ${deliveryId} → ${socket.id}`);
            }
        });

        socket.on('disconnect', () => {
            // Remove from map on disconnect
            for (const [id, sid] of deliverySockets.entries()) {
                if (sid === socket.id) {
                    deliverySockets.delete(id);
                    console.log(`[Socket] Delivery partner disconnected: ${id}`);
                    break;
                }
            }
        });
    });
};

export const getIO = () => {
    if (!_io) throw new Error('Socket.IO not initialized');
    return _io;
};

/**
 * Broadcast a "new_order_packed" event to ALL connected delivery partners.
 */
export const notifyDeliveryPartners = (orderData) => {
    if (!_io) return;
    _io.emit('new_order_packed', orderData);
    console.log(`[Socket] Broadcasted new_order_packed for order: ${orderData.orderId}`);
};
