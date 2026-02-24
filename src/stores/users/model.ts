export class Data {
  id!: string;
  name?: string;
  surname?: string;
  username?: string;
  email?: string;
  emailVerified?: Date;
  emailVerificationToken?: string;
  passwordHash?: string;
  resetPasswordToken?: string;
  resetPasswordTokenExpiry?: Date;
  image?: string;
  createdAt?: Date;
  address?: string;
  phone?: string;
  isVerified: boolean = false;
  onboardingCompleted: boolean = false;
  role?: string;
  organization?: UserOnOrganization[];
}

export interface UserOnOrganization {
  userId: string;
  organizationId: string;
}
