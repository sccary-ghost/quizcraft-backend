import { Request, Response } from "express";
import {
  getCandidatesList,
  getCandidateProfileDetails,
  getCandidateAttemptsHistory,
  updateCandidateDetails,
} from "../services/user.service";

/**
 * Controller to fetch list of candidates with search, filter, and sorting.
 */
export const listCandidates = async (req: Request, res: Response) => {
  try {
    const search = (req.query.search as string) || "";
    const filter = (req.query.filter as string) || "";
    const sortBy = (req.query.sortBy as string) || "name";

    const candidates = await getCandidatesList(search, filter, sortBy);
    res.json(candidates);
  } catch (error: any) {
    res.status(500).json({
      message: error.message || "Failed to retrieve candidates list",
    });
  }
};

/**
 * Controller to fetch detailed candidate profile stats.
 */
export const candidateProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const profile = await getCandidateProfileDetails(id as string);
    res.json(profile);
  } catch (error: any) {
    res.status(404).json({
      message: error.message || "Candidate profile not found",
    });
  }
};

/**
 * Controller to fetch detailed candidate attempt history.
 */
export const candidateAttempts = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const history = await getCandidateAttemptsHistory(id as string);
    res.json(history);
  } catch (error: any) {
    res.status(500).json({
      message: error.message || "Failed to retrieve candidate attempts history",
    });
  }
};

/**
 * Controller to update candidate information or status.
 */
export const editCandidate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, mobileNumber, isActive, profilePhoto } = req.body;

    const updated = await updateCandidateDetails(id as string, {
      name,
      email,
      mobileNumber,
      isActive,
      profilePhoto,
    });

    res.json({
      message: "Candidate updated successfully",
      candidate: updated,
    });
  } catch (error: any) {
    res.status(400).json({
      message: error.message || "Failed to update candidate details",
    });
  }
};
