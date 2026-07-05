import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { AIProvider } from "@prisma/client";

export const getSettings = async (req: Request, res: Response) => {
  try {
    let settings = await prisma.systemSettings.findUnique({ where: { id: "default" } });
    if (!settings) {
      settings = await prisma.systemSettings.create({ data: { id: "default" } });
    }
    res.json(settings);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const settings = await prisma.systemSettings.upsert({
      where: { id: "default" },
      update: data,
      create: { id: "default", ...data },
    });
    res.json({ message: "Settings updated", settings });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

export const getAIProviders = async (req: Request, res: Response) => {
  try {
    const providers = await prisma.aIProviderConfig.findMany({ orderBy: { provider: "asc" } });
    // Mask API keys
    const masked = providers.map((p) => ({
      ...p,
      apiKey: p.apiKey ? `${p.apiKey.slice(0, 6)}...${p.apiKey.slice(-4)}` : null,
    }));
    res.json(masked);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

export const updateAIProvider = async (req: Request, res: Response) => {
  try {
    const provider = req.params.provider as AIProvider;
    const { apiKey, endpoint, modelName, enabled, temperature, maxTokens } = req.body;

    const config = await prisma.aIProviderConfig.upsert({
      where: { provider },
      update: { apiKey, endpoint, modelName, enabled, temperature, maxTokens },
      create: { provider, apiKey, endpoint, modelName, enabled: enabled ?? true, temperature: temperature ?? 0.7, maxTokens: maxTokens ?? 2048 },
    });

    res.json({ message: "Provider config updated", config: { ...config, apiKey: config.apiKey ? "***" : null } });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

export const getPromptTemplates = async (req: Request, res: Response) => {
  try {
    const templates = await prisma.aIPromptTemplate.findMany({ orderBy: { purpose: "asc" } });
    res.json(templates);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

export const updatePromptTemplate = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, prompt, provider, enabled } = req.body;
    const template = await prisma.aIPromptTemplate.update({
      where: { id },
      data: { name, prompt, provider, enabled },
    });
    res.json({ message: "Template updated", template });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};
