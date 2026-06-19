import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import prisma from "../utils/prisma";

export const registerUser = async (
  name: string,
  email: string,
  password: string
) => {
  const existingUser = await prisma.user.findUnique({
  where: {
    email,
  },
});

if (existingUser) {
  throw new Error("Email already exists");
}
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    },
  });

  return {
    message: "User created successfully",
    user,
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

  const isPasswordValid = await bcrypt.compare(
    password,
    user.password
  );

  if (!isPasswordValid) {
    throw new Error("Invalid credentials");
  }

  const token = jwt.sign(
  {
    userId: user.id,
    email: user.email,
  },
  process.env.JWT_SECRET as string,
  {
    expiresIn: "7d",
  }
);

return {
  message: "Login successful",
  token,
  user,
};
};