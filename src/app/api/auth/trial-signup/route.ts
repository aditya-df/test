// Updated src/app/api/auth/trial-signup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/config/db';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { AuditAction, logUserAction } from '@/lib/audit-log';

export async function POST(request: NextRequest) {
  try {
    console.log('➡️ Received trial signup request');
    const { name, email, password, trialToken, trialDays } = await request.json();
    console.log('📩 Request body:', { name, email, trialToken, trialDays });

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    console.log('🔍 Existing user lookup result:', existingUser);

    if (existingUser) {
      console.warn(`⚠️ User already exists with email: ${email}`);
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('🔐 Password hashed successfully');

    // Calculate trial end date
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + trialDays);
    console.log('📅 Calculated trial end date:', trialEndDate);

    // Create trial user with admin role
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        userType: 'TRIAL',
        trialEndDate,
        trialToken,
        emailVerified: new Date(), // Auto-verify trial users
        role: [UserRole.admin], // Give admin role to trial users
        onboardingCompleted: true,
        onboardingGuideCompleted: true,
      },
    });
    console.log('✅ Trial user created:', { id: user.id, email: user.email, roles: user.role });

    // Log account creation to audit logs
    try {
      await logUserAction(
        user.id,
        user.email || 'unknown',
        user.name || 'Unknown User',
        AuditAction.ACCOUNT_CREATED,
        request,
        {
          registrationType: 'trial',
          userType: 'TRIAL',
          role: user.role,
          trialEndDate: trialEndDate.toISOString(),
          autoVerified: true,
        },
        true
      );
    } catch (auditError) {
      console.error('Failed to create audit log for trial signup:', auditError);
    }

    console.log('🎉 Trial signup flow completed successfully for user:', user.id);

    return NextResponse.json({
      success: true,
      message: 'Trial account created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        userType: user.userType,
      },
    });
  } catch (error) {
    console.error('🔥 Error creating trial user:', error);
    return NextResponse.json(
      { error: 'Failed to create trial user' },
      { status: 500 }
    );
  }
}
