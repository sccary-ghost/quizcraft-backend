"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleNotification = exports.broadcast = exports.deleteNotification = exports.markAllRead = exports.markRead = exports.getMyNotifications = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
const getMyNotifications = async (req, res) => {
    try {
        const userId = req.user.userId;
        const notifications = await prisma_1.default.notification.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 50,
        });
        const unreadCount = notifications.filter((n) => !n.read).length;
        res.json({ notifications, unreadCount });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
};
exports.getMyNotifications = getMyNotifications;
const markRead = async (req, res) => {
    try {
        const userId = req.user.userId;
        const id = req.params.id;
        await prisma_1.default.notification.updateMany({
            where: { id, userId },
            data: { read: true },
        });
        res.json({ message: "Marked as read" });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
};
exports.markRead = markRead;
const markAllRead = async (req, res) => {
    try {
        const userId = req.user.userId;
        await prisma_1.default.notification.updateMany({
            where: { userId, read: false },
            data: { read: true },
        });
        res.json({ message: "All marked as read" });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
};
exports.markAllRead = markAllRead;
const deleteNotification = async (req, res) => {
    try {
        const userId = req.user.userId;
        await prisma_1.default.notification.deleteMany({ where: { id: req.params.id, userId } });
        res.json({ message: "Notification deleted" });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
};
exports.deleteNotification = deleteNotification;
const broadcast = async (req, res) => {
    try {
        const { title, message, type, priority, actionUrl, expiresAt } = req.body;
        if (!title || !message)
            return res.status(400).json({ message: "title and message are required" });
        const users = await prisma_1.default.user.findMany({ where: { isActive: true }, select: { id: true } });
        await prisma_1.default.notification.createMany({
            data: users.map((u) => ({
                userId: u.id,
                title,
                message,
                type: type ?? client_1.NotificationType.ANNOUNCEMENT,
                priority: priority ?? client_1.NotificationPriority.MEDIUM,
                actionUrl: actionUrl ?? null,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                isSent: true,
                sentAt: new Date(),
            })),
        });
        res.json({ message: `Broadcast sent to ${users.length} users` });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
};
exports.broadcast = broadcast;
const scheduleNotification = async (req, res) => {
    try {
        const { userId, title, message, type, priority, actionUrl, scheduledAt } = req.body;
        if (!title || !message || !scheduledAt)
            return res.status(400).json({ message: "title, message, scheduledAt are required" });
        const notification = await prisma_1.default.notification.create({
            data: {
                userId,
                title,
                message,
                type: type ?? client_1.NotificationType.IN_APP,
                priority: priority ?? client_1.NotificationPriority.LOW,
                actionUrl: actionUrl ?? null,
                scheduledAt: new Date(scheduledAt),
                isSent: false,
            },
        });
        res.json({ message: "Notification scheduled", notification });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
};
exports.scheduleNotification = scheduleNotification;
