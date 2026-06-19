import { Request, Response } from "express";
import {
  registerUser,
  loginUser,
} from "../services/auth.service";

export const register = async (
  req: Request,
  res: Response
) => {
  const { name, email, password } = req.body;

  try {
  const result = await registerUser(
    name,
    email,
    password
  );

  res.json(result);
} catch (error: any) {
  res.status(400).json({
    message: error.message,
  });
}
};

export const login = async (
  req: Request,
  res: Response
) => {
  try {
    const { email, password } = req.body;

    const result = await loginUser(
      email,
      password
    );

    res.json(result);
  } catch (error: any) {
    res.status(400).json({
      message: error.message,
    });
  }
};
export const getMe = async (
  req: Request,
  res: Response
) => {
  res.json({
    user: (req as any).user,
  });
};