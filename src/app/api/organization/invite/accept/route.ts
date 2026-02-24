import { prisma } from "@/config/db";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from 'bcryptjs';
import { AuditAction, logUserAction } from "@/lib/audit-log";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, name, surname, username, phone, address, password } = body;

    console.log("Received invitation acceptance:", body);

    if (!token) {
      console.log("No token provided in the request body.");
      return NextResponse.json(
        { success: false, message: "Token is missing." },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!name || !surname || !username || !phone || !address || !password) {
      console.log("Missing required fields in the request body.");
      return NextResponse.json({
        success: false, message: "All fields are required."
      }, { status: 400 });
    }

    // Check if the token exists and is not expired
    const invitation = await prisma.invitationToken.findFirst({
      where: {
        token: token as string,
      },
    });

    if (!invitation) {
      console.log("Invalid token:", token);
      return NextResponse.json({
        success: false,
        message: "Invalid invitation token."
      }, { status: 400 });
    }

    // Check if user already exists with this email
    const existingUser = await prisma.user.findUnique({
      where: {
        email: invitation.email,
      },
    });

    if (existingUser) {
      console.log("User already registered:", invitation.email);
      return NextResponse.json({
        success: false,
        message: "This email is already registered. Please sign in instead.",
        code: "USER_ALREADY_EXISTS"
      }, { status: 409 }); // 409 Conflict
    }

    // Check if username is already taken
    const existingUsername = await prisma.user.findUnique({
      where: {
        username: username,
      },
    });

    if (existingUsername) {
      console.log("Username already taken:", username);
      return NextResponse.json({
        success: false,
        message: "This username is already taken. Please choose another one.",
        code: "USERNAME_TAKEN"
      }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        surname,
        username,
        phone,
        address,
        email: invitation.email,
        emailVerified: new Date(),
        onboardingCompleted: true,
        role: ["user"],
        passwordHash: hashedPassword,
      },
    }).then(async (createdUser) => {
      // This will only execute after the user is successfully created
      const addToOrganization = await prisma.userOnOrganization.create({
        data: {
          organizationId: invitation.organizationId,
          userId: createdUser.id
        }
      });

      // Return both the user and the organization relationship
      return {
        user: createdUser,
        userOrganization: addToOrganization
      };
    });

    console.log("New user created:", newUser);

    // Log account creation to audit logs
    try {
      await logUserAction(
        newUser.user.id,
        newUser.user.email || 'unknown',
        newUser.user.name || 'Unknown User',
        AuditAction.ACCOUNT_CREATED,
        req,
        {
          registrationType: 'invitation',
          organizationId: invitation.organizationId,
          role: newUser.user.role,
          username: newUser.user.username,
          autoVerified: true,
        },
        true
      );
    } catch (auditError) {
      console.error('Failed to create audit log for invitation acceptance:', auditError);
    }

    return NextResponse.json({
      success: true,
      message: "User registered successfully."
    }, { status: 200 });

  } catch (error) {
    console.error("Error accepting invitation:", error);

    // Handle Prisma unique constraint errors
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({
        success: false,
        message: "This email or username is already registered.",
        code: "DUPLICATE_ENTRY"
      }, { status: 409 });
    }

    return NextResponse.json({
      success: false,
      message: "Internal server error."
    }, { status: 500 });
  }
}