import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    // Validate with external invitation service
    const invitationResponse = await fetch(`${process.env.INVITATION_SERVICE_URL}/api/invitations/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!invitationResponse.ok) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      );
    }

    const invitationData = await invitationResponse.json();

    return NextResponse.json({
      valid: true,
      email: invitationData.invitation.email,
      trialDays: invitationData.invitation.trialDays,
      token,
    });
  } catch (error) {
    console.error('Error validating trial token:', error);
    return NextResponse.json(
      { error: 'Failed to validate token' },
      { status: 500 }
    );
  }
}