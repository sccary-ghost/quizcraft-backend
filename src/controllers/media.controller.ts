import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import sizeOf from "image-size";
import prisma from "../utils/prisma";
import { logAuditAction } from "../utils/auditLogger";

// Helper to calculate dynamic usages of a media file in active questions
async function getMediaUsages(fileName: string) {
  const usages = await prisma.question.findMany({
    where: {
      OR: [
        { question: { contains: fileName } },
        { explanation: { contains: fileName } },
      ],
      isDeleted: false,
    },
    select: {
      id: true,
      question: true,
      explanation: true,
    },
  });

  return usages.map((q) => ({
    id: q.id,
    inQuestion: q.question.includes(fileName),
    inExplanation: q.explanation ? q.explanation.includes(fileName) : false,
  }));
}

// Get all media list
export const listMedia = async (req: Request, res: Response) => {
  try {
    const mediaItems = await prisma.media.findMany({
      orderBy: { createdAt: "desc" },
    });

    const itemsWithUsages = await Promise.all(
      mediaItems.map(async (item) => {
        const usages = await getMediaUsages(item.fileName);
        return {
          ...item,
          usageCount: usages.length,
          lastUsed: usages.length > 0 ? item.updatedAt : null,
          usages,
        };
      })
    );

    res.json(itemsWithUsages);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Upload new media item
export const uploadMedia = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const originalName = req.file.originalname;
    const mimeType = req.file.mimetype;
    const fileSize = req.file.size;

    // Extract dimensions using image-size
    let width = 0;
    let height = 0;
    try {
      const dimensions = sizeOf(req.file.buffer);
      width = dimensions.width || 0;
      height = dimensions.height || 0;
    } catch (err) {
      console.warn("Could not determine image size:", err);
    }

    // Save to disk
    const fileName = `${Date.now()}-${originalName.replace(/\s+/g, "_")}`;
    const uploadsDir = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, req.file.buffer);

    const uploader = (req as any).user?.name || (req as any).user?.email || "Admin";

    const media = await prisma.media.create({
      data: {
        fileName,
        originalName,
        mimeType,
        fileSize,
        width,
        height,
        uploadedBy: uploader,
      },
    });

    await logAuditAction(req, "Media Uploaded", media.id);

    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${fileName}`;
    res.json({
      ...media,
      url: imageUrl,
      usageCount: 0,
      usages: [],
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Rename user-facing originalName
export const renameMedia = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const originalName = req.body.originalName as string | undefined;

    if (!originalName || originalName.trim().length === 0) {
      return res.status(400).json({ message: "originalName is required" });
    }

    const updated = await prisma.media.update({
      where: { id },
      data: { originalName: originalName.trim() },
    });

    await logAuditAction(req, "Media Renamed", id);

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Replace file content on disk
export const replaceMedia = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!req.file) {
      return res.status(400).json({ message: "No replacement file provided" });
    }

    const media = await prisma.media.findUnique({
      where: { id },
    });

    if (!media) {
      return res.status(404).json({ message: "Media item not found" });
    }

    // Overwrite the existing file on disk
    const filePath = path.join(__dirname, "../../uploads", media.fileName);
    fs.writeFileSync(filePath, req.file.buffer);

    // Extract new dimensions
    let width = media.width;
    let height = media.height;
    try {
      const dimensions = sizeOf(req.file.buffer);
      width = dimensions.width || 0;
      height = dimensions.height || 0;
    } catch (err) {
      console.warn("Could not determine size of replacement image:", err);
    }

    const updated = await prisma.media.update({
      where: { id },
      data: {
        fileSize: req.file.size,
        width,
        height,
        mimeType: req.file.mimetype,
      },
    });

    await logAuditAction(req, "Media Replaced", id);

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Download media trigger
export const downloadMedia = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const media = await prisma.media.findUnique({
      where: { id },
    });

    if (!media) {
      return res.status(404).json({ message: "Media not found" });
    }

    const filePath = path.join(__dirname, "../../uploads", media.fileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Physical file not found on disk" });
    }

    res.download(filePath, media.originalName);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Delete media item
export const deleteMedia = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const media = await prisma.media.findUnique({
      where: { id },
    });

    if (!media) {
      return res.status(404).json({ message: "Media not found" });
    }

    // Enforce check: Do not delete if referenced
    const usages = await getMediaUsages(media.fileName);
    if (usages.length > 0) {
      return res.status(400).json({
        message: "Cannot delete media resource. It is currently referenced in active questions or explanations.",
        usages,
      });
    }

    // Delete physical file
    const filePath = path.join(__dirname, "../../uploads", media.fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete db record
    await prisma.media.delete({
      where: { id },
    });

    await logAuditAction(req, "Media Deleted", id);

    res.json({ message: "Media item deleted successfully." });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Bulk delete unreferenced items
export const bulkDeleteMedia = async (req: Request, res: Response) => {
  try {
    const ids = req.body.ids as string[] | undefined;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "ids array is required" });
    }

    const mediaList = await prisma.media.findMany({
      where: { id: { in: ids } },
    });

    const deletedIds: string[] = [];
    const skippedIds: string[] = [];

    for (const media of mediaList) {
      const usages = await getMediaUsages(media.fileName);
      if (usages.length > 0) {
        skippedIds.push(media.id);
        continue;
      }

      // Delete physical file
      const filePath = path.join(__dirname, "../../uploads", media.fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Delete db record
      await prisma.media.delete({
        where: { id: media.id },
      });

      deletedIds.push(media.id);
    }

    await logAuditAction(req, `Bulk Media Deleted: ${deletedIds.length} items`);

    res.json({
      message: `Successfully deleted ${deletedIds.length} items. Skipped ${skippedIds.length} referenced items.`,
      deletedIds,
      skippedIds,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
