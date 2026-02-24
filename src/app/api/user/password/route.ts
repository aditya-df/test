import { prisma } from "@/config/db";
import { getAuthSession } from "@/utils/auth-utils-server";
import bcryptjs from "bcryptjs";
import { z } from "zod";

const passwordSchema = z
  .string()
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/, {
    message:
      "Password must contain at least 8 characters, including one uppercase, one lowercase, one number and one special character",
  });

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { newpassword, password } = body;

    const session = await getAuthSession();
    const userEmail = session?.user.email;

    if (!newpassword) {
      return Response.json(
        { message: "New password must be provided" },
        { status: 400 },
      );
    }

    const passwordValidation = passwordSchema.safeParse(newpassword);
    if (!passwordValidation.success) {
      return Response.json(
        { message: passwordValidation.error.message },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email: userEmail as string,
      },
    });

    if (!user) {
      return Response.json(
        { message: "User not found", exists: false },
        { status: 200 },
      );
    }

    // Adding new password (when passwordHash is null)
    if (!user.passwordHash) {
      const passwordHash = await bcryptjs.hash(newpassword, 10);
      const userUpdated = await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          resetPasswordToken: null,
          resetPasswordTokenExpiry: null,
        },
      });

      return Response.json({
        userUpdated,
        message: "Password updated successfully",
      });
    }

    // Changing existing password
    if (!password) {
      return Response.json(
        { message: "Current password must be provided" },
        { status: 400 },
      );
    }

    const oldPasswordIsValid = await bcryptjs.compare(
      password,
      user.passwordHash,
    );

    if (oldPasswordIsValid) {
      const passwordHash = await bcryptjs.hash(newpassword, 10);
      const userUpdated = await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          resetPasswordToken: null,
          resetPasswordTokenExpiry: null,
        },
      });

      return Response.json({
        userUpdated,
        message: "Password updated successfully",
      });
    }

    return Response.json(
      { message: "Old Password is not valid" },
      { status: 401 },
    );
  } catch (error) {
    console.error(error);
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
}
