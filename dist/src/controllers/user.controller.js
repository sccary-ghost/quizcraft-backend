"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.editCandidate = exports.candidateAttempts = exports.candidateProfile = exports.listCandidates = void 0;
const user_service_1 = require("../services/user.service");
const prisma_1 = __importDefault(require("../utils/prisma"));
const auditLogger_1 = require("../utils/auditLogger");
/**
 * Controller to fetch list of candidates with search, filter, and sorting.
 */
const listCandidates = async (req, res) => {
    try {
        const search = req.query.search || "";
        const filter = req.query.filter || "";
        const sortBy = req.query.sortBy || "name";
        const candidates = await (0, user_service_1.getCandidatesList)(search, filter, sortBy);
        res.json(candidates);
    }
    catch (error) {
        res.status(500).json({
            message: error.message || "Failed to retrieve candidates list",
        });
    }
};
exports.listCandidates = listCandidates;
/**
 * Controller to fetch detailed candidate profile stats.
 */
const candidateProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const profile = await (0, user_service_1.getCandidateProfileDetails)(id);
        res.json(profile);
    }
    catch (error) {
        res.status(404).json({
            message: error.message || "Candidate profile not found",
        });
    }
};
exports.candidateProfile = candidateProfile;
/**
 * Controller to fetch detailed candidate attempt history.
 */
const candidateAttempts = async (req, res) => {
    try {
        const { id } = req.params;
        const history = await (0, user_service_1.getCandidateAttemptsHistory)(id);
        res.json(history);
    }
    catch (error) {
        res.status(500).json({
            message: error.message || "Failed to retrieve candidate attempts history",
        });
    }
};
exports.candidateAttempts = candidateAttempts;
/**
 * Controller to update candidate information or status.
 */
const editCandidate = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, mobileNumber, isActive, profilePhoto } = req.body;
        const current = await prisma_1.default.user.findUnique({
            where: { id: id },
        });
        const updated = await (0, user_service_1.updateCandidateDetails)(id, {
            name,
            email,
            mobileNumber,
            isActive,
            profilePhoto,
        });
        if (isActive !== undefined && current && current.isActive !== isActive) {
            const action = isActive ? "Candidate Activated" : "Candidate Deactivated";
            await (0, auditLogger_1.logAuditAction)(req, action, id);
        }
        else {
            await (0, auditLogger_1.logAuditAction)(req, "Candidate Profile Updated", id);
        }
        res.json({
            message: "Candidate updated successfully",
            candidate: updated,
        });
    }
    catch (error) {
        res.status(400).json({
            message: error.message || "Failed to update candidate details",
        });
    }
};
exports.editCandidate = editCandidate;
