import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import prisma from "../utils/prisma";
import { isDisposableEmail } from "../utils/emailBlacklist";

export const registerUser = async (
  name: string,
  email: string,
  password: string,
  mobileNumber: string
) => {
  // 1. Validate name
  if (!name || name.trim().length < 2) {
    throw new Error("Name must be at least 2 characters long");
  }

  // 2. Validate email format
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Invalid email format");
  }

  // 3. Reject disposable emails
  if (isDisposableEmail(email)) {
    throw new Error("Registration from temporary/disposable email providers is not allowed");
  }

  // 4. Validate mobile number (exactly 10 digits)
  if (!mobileNumber || !/^\d{10}$/.test(mobileNumber)) {
    throw new Error("Mobile number must be exactly 10 digits and numeric only");
  }

  // 5. Unique checks
  const existingEmail = await prisma.user.findUnique({
    where: { email },
  });
  if (existingEmail) {
    throw new Error("Email already registered");
  }

  const existingMobile = await prisma.user.findUnique({
    where: { mobileNumber },
  });
  if (existingMobile) {
    throw new Error("Mobile number already registered");
  }

  // 6. Password check
  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters long");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      mobileNumber,
      isActive: true,
      lastLogin: new Date(),
    },
  });

  return {
    message: "User created successfully",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      mobileNumber: user.mobileNumber,
      isActive: user.isActive,
      role: user.role,
      createdAt: user.createdAt,
    },
  };
};

export const loginUser = async (
  email: string,
  password: string
) => {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw new Error("Invalid credentials");
  }

  // Reject login for deactivated candidates
  if (user.isActive === false) {
    throw new Error("Your account has been deactivated. Please contact administration.");
  }

  // Verify password hash
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw new Error("Invalid email or password");
  }

  // Update lastLogin
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET as string,
    {
      expiresIn: "7d",
    }
  );

  return {
    message: "Login successful",
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      mobileNumber: user.mobileNumber,
      isActive: user.isActive,
      role: user.role,
    },
  };
};

export const changeMobile = async (userId: string, newMobileNumber: string) => {
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { mobileNumber: newMobileNumber },
    });

    await tx.otpVerification.delete({
      where: { mobileNumber: newMobileNumber },
    });
  });
};

export const changeEmail = async (userId: string, newEmail: string) => {
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { email: newEmail },
    });

    await tx.emailOtpVerification.delete({
      where: { email: newEmail },
    });
  });
};
