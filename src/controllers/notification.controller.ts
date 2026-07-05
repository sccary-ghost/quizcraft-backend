import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { NotificationType, NotificationPriority } from "@prisma/client";

export const getMyNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const unreadCount = notifications.filter((n) => !n.read).length;
    res.json({ notifications, unreadCount });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

export const markRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const id = req.params.id as string;
    await prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
    res.json({ message: "Marked as read" });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

export const markAllRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    res.json({ message: "All marked as read" });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    await prisma.notification.deleteMany({ where: { id: req.params.id as string, userId } });
    res.json({ message: "Notification deleted" });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

export const broadcast = async (req: Request, res: Response) => {
  try {
    const { title, message, type, priority, actionUrl, expiresAt } = req.body;
    if (!title || !message) return res.status(400).json({ message: "title and message are required" });

    const users = await prisma.user.findMany({ where: { isActive: true }, select: { id: true } });
    await prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        title,
        message,
        type: (type as NotificationType) ?? NotificationType.ANNOUNCEMENT,
        priority: (priority as NotificationPriority) ?? NotificationPriority.MEDIUM,
        actionUrl: actionUrl ?? null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isSent: true,
        sentAt: new Date(),
      })),
    });

    res.json({ message: `Broadcast sent to ${users.length} users` });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

export const scheduleNotification = async (req: Request, res: Response) => {
  try {
    const { userId, title, message, type, priority, actionUrl, scheduledAt } = req.body;
    if (!title || !message || !scheduledAt) return res.status(400).json({ message: "title, message, scheduledAt are required" });

    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type: (type as NotificationType) ?? NotificationType.IN_APP,
        priority: (priority as NotificationPriority) ?? NotificationPriority.LOW,
        actionUrl: actionUrl ?? null,
        scheduledAt: new Date(scheduledAt),
        isSent: false,
      },
    });

    res.json({ message: "Notification scheduled", notification });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};
