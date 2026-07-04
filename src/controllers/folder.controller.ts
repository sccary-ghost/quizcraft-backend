import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { logAuditAction } from "../utils/auditLogger";

// Get all folders
export const getFolders = async (req: Request, res: Response) => {
  try {
    const folders = await prisma.folder.findMany({
      include: {
        questions: {
          select: { id: true },
        },
      },
    });

    res.json(folders);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new folder
export const createFolder = async (req: Request, res: Response) => {
  try {
    const name = req.body.name as string | undefined;
    const parentId = req.body.parentId as string | undefined;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: "Folder name is required." });
    }

    const newFolder = await prisma.folder.create({
      data: {
        name: name.trim(),
        parentId: parentId || null,
      },
    });

    await logAuditAction(req, "Folder Created", newFolder.id);

    res.json(newFolder);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Update/Rename/Move folder
export const updateFolder = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const name = req.body.name as string | undefined;
    const parentId = req.body.parentId as string | null | undefined;

    // Check circular references if parentId is supplied
    if (parentId && parentId === id) {
      return res.status(400).json({ message: "A folder cannot be its own parent." });
    }

    const updatedFolder = await prisma.folder.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(parentId !== undefined && { parentId: parentId || null }),
      },
    });

    await logAuditAction(req, "Folder Updated", id);

    res.json(updatedFolder);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a folder
export const deleteFolder = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    await prisma.folder.delete({
      where: { id },
    });

    await logAuditAction(req, "Folder Deleted", id);

    res.json({ message: "Folder deleted successfully." });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Move questions to folder
export const assignQuestions = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string; // folderId (can be "root" or null to unassign)
    const questionIds = req.body.questionIds as string[] | undefined;

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({ message: "questionIds array is required." });
    }

    const targetFolderId = id === "root" || !id ? null : id;

    await prisma.question.updateMany({
      where: { id: { in: questionIds } },
      data: {
        folderId: targetFolderId,
      },
    });

    await logAuditAction(req, `Moved ${questionIds.length} questions to folder: ${targetFolderId || "Root"}`);

    res.json({ message: "Questions folder assignments updated successfully." });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
