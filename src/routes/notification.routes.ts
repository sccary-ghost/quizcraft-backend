import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  getMyNotifications, markRead, markAllRead,
  deleteNotification, broadcast, scheduleNotification,
} from "../controllers/notification.controller";

const router = Router();
router.use(authenticate);

router.get("/",                 getMyNotifications);
router.post("/mark-read/:id",   markRead);
router.post("/mark-all-read",   markAllRead);
router.delete("/:id",           deleteNotification);
router.post("/broadcast",       broadcast);
router.post("/schedule",        scheduleNotification);

export default router;
