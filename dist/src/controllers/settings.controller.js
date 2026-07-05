"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePromptTemplate = exports.getPromptTemplates = exports.updateAIProvider = exports.getAIProviders = exports.updateSettings = exports.getSettings = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const getSettings = async (req, res) => {
    try {
        let settings = await prisma_1.default.systemSettings.findUnique({ where: { id: "default" } });
        if (!settings) {
            settings = await prisma_1.default.systemSettings.create({ data: { id: "default" } });
        }
        res.json(settings);
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
};
exports.getSettings = getSettings;
const updateSettings = async (req, res) => {
    try {
        const data = req.body;
        const settings = await prisma_1.default.systemSettings.upsert({
            where: { id: "default" },
            update: data,
            create: { id: "default", ...data },
        });
        res.json({ message: "Settings updated", settings });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
};
exports.updateSettings = updateSettings;
const getAIProviders = async (req, res) => {
    try {
        const providers = await prisma_1.default.aIProviderConfig.findMany({ orderBy: { provider: "asc" } });
        // Mask API keys
        const masked = providers.map((p) => ({
            ...p,
            apiKey: p.apiKey ? `${p.apiKey.slice(0, 6)}...${p.apiKey.slice(-4)}` : null,
        }));
        res.json(masked);
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
};
exports.getAIProviders = getAIProviders;
const updateAIProvider = async (req, res) => {
    try {
        const provider = req.params.provider;
        const { apiKey, endpoint, modelName, enabled, temperature, maxTokens } = req.body;
        const config = await prisma_1.default.aIProviderConfig.upsert({
            where: { provider },
            update: { apiKey, endpoint, modelName, enabled, temperature, maxTokens },
            create: { provider, apiKey, endpoint, modelName, enabled: enabled ?? true, temperature: temperature ?? 0.7, maxTokens: maxTokens ?? 2048 },
        });
        res.json({ message: "Provider config updated", config: { ...config, apiKey: config.apiKey ? "***" : null } });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
};
exports.updateAIProvider = updateAIProvider;
const getPromptTemplates = async (req, res) => {
    try {
        const templates = await prisma_1.default.aIPromptTemplate.findMany({ orderBy: { purpose: "asc" } });
        res.json(templates);
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
};
exports.getPromptTemplates = getPromptTemplates;
const updatePromptTemplate = async (req, res) => {
    try {
        const id = req.params.id;
        const { name, prompt, provider, enabled } = req.body;
        const template = await prisma_1.default.aIPromptTemplate.update({
            where: { id },
            data: { name, prompt, provider, enabled },
        });
        res.json({ message: "Template updated", template });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
};
exports.updatePromptTemplate = updatePromptTemplate;
