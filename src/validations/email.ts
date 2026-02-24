import * as z from "zod";

// Zod 4.x: required_error and invalid_type_error replaced with message
export const emailSchema = z
  .string({
    message: "Email is required and must be a string",
  })
  .min(5, {
    message: "Email must be made of at least 5 characters",
  })
  .max(64, {
    message: "Email must be made of at most 64 characters",
  })
  .email({
    message: "Please enter a valid email address",
  });

export const contactFormSchema = z.object({
  email: emailSchema,
  // Zod 4.x: required_error and invalid_type_error replaced with message
  name: z
    .string({
      message: "Name is required and must be a string",
    })
    .max(128, {
      message: "Name must be made of at most 128 characters",
    }),
  // Zod 4.x: required_error and invalid_type_error replaced with message
  message: z
    .string({
      message: "Message is required and must be a string",
    })
    .max(10240, {
      message: "Message must be made of at most 10240 characters",
    }),
});

export const emailVerificationSchema = z.object({
  email: emailSchema,
});

export const markEmailAsVerifiedSchema = z.object({
  token: z.string(),
});

export const checkIfEmailVerifiedSchema = z.object({
  email: emailSchema,
});

export type EmailVerificationFormInput = z.infer<
  typeof emailVerificationSchema
>;

export type MarkEmailAsVerifiedInput = z.infer<
  typeof markEmailAsVerifiedSchema
>;

export type CheckIfEmailVerifiedInput = z.infer<
  typeof checkIfEmailVerifiedSchema
>;

export type ContactFormInput = z.infer<typeof contactFormSchema>;
