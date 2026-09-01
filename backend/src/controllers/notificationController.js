import asyncHandler from 'express-async-handler';
import Notification from '../models/Notification.js';

/**
 * @desc    Get user notifications
 * @route   GET /api/notifications
 * @access  Private
 */
export const getMyNotifications = asyncHandler(async (req, res) => {
    const notifications = await Notification.find({ recipient: req.user._id })
        .sort({ createdAt: -1 })
        .limit(50);
    
    res.json(notifications);
});

/**
 * @desc    Mark notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
export const markAsRead = asyncHandler(async (req, res) => {
    const notification = await Notification.findOneAndUpdate(
        { _id: req.params.id, recipient: req.user._id },
        { isRead: true, readAt: Date.now() },
        { new: true }
    );

    if (notification) {
        res.json(notification);
    } else {
        res.status(404);
        throw new Error('Notification not found');
    }
});

/**
 * @desc    Mark all as read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
export const markAllRead = asyncHandler(async (req, res) => {
    await Notification.updateMany(
        { recipient: req.user._id, isRead: false },
        { isRead: true, readAt: Date.now() }
    );
    res.json({ success: true });
});
