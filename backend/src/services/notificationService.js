import Notification from '../models/Notification.js';
import { sendToUser } from './socketService.js';

/**
 * Create and send a notification to a specific user
 */
export const createNotification = async ({
    recipient,
    type,
    title,
    message,
    link,
    metadata
}) => {
    try {
        const notification = await Notification.create({
            recipient,
            type,
            title,
            message,
            link,
            metadata
        });

        // Push real-time via socket
        sendToUser(recipient, 'new_notification', notification);

        return notification;
    } catch (error) {
        console.error('Failed to create notification:', error);
    }
};

/**
 * Handle system-wide alerts (e.g. low stock)
 * Can be used to notify all admins or specific roles
 */
export const notifyAdmins = async ({ title, message, link, metadata }) => {
    // Implement logic to find all admins and notify them
    // For now, this is a placeholder for future expansion
};
