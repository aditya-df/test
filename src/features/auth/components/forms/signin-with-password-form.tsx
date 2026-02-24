"use client";

import * as React from "react";
import { useRouter } from "nextjs-toploader/app";
import { signInWithPassword } from "@/services/auth";
import {
  signInWithPasswordSchema,
  type SignInWithPasswordFormInput,
} from "@/validations/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import ReCAPTCHA from "react-google-recaptcha";

import {
  DEFAULT_SIGNIN_REDIRECT,
  DEFAULT_SIGNIN_UNVERIFIED_REDIRECT,
} from "@/config/defaults";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Icons } from "@/components/icons";
import { PasswordInput } from "@/components/password-input";
import { env } from "@/env.mjs";

export function SignInWithPasswordForm({
  useRecaptcha,
}: any): React.ReactElement {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const [isUsingRecaptcha, setIsUsingRecaptcha] = React.useState(false);
  React.useEffect(() => {
    setIsUsingRecaptcha(useRecaptcha === "true");
  }, [useRecaptcha]);

  const form = useForm<SignInWithPasswordFormInput>({
    resolver: zodResolver(signInWithPasswordSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const [captchaNeeded, setCaptchaNeeded] = React.useState(false);
  const [captchaToken, setCaptchaToken] = React.useState<string>("");

  React.useEffect(() => {
    const attempts = parseInt(localStorage.getItem("loginAttempts") || "0");
    if (attempts >= 3) {
      setCaptchaNeeded(true);
    }
  }, []);

  function onSubmit(formData: SignInWithPasswordFormInput) {
    startTransition(async () => {
      try {
        if (isUsingRecaptcha && captchaNeeded && !captchaToken) {
          toast.error("Please complete the captcha");
          return;
        }

        const message = await signInWithPassword({
          email: formData.email,
          password: formData.password,
          captchaToken: captchaToken || "",
          attempts: localStorage.getItem("loginAttempts") || "0",
        });

        switch (message) {
          case "not-registered":
            toast({
              title: "First things first",
              description:
                "Please make sure you are signed up before signing in",
            });
            break;
          case "incorrect-provider":
            toast({
              title: "Email already in use with another provider",
              description: "Perhaps you signed up with a different method?",
            });
            break;
          case "unverified-email":
            toast({
              title: "First things first",
              description: "Please verify your email address before signing in",
            });
            break;
          case "invalid-credentials":
            toast({
              title: "Invalid email or Password",
              description: "Double-check your credentials and try again",
              variant: "destructive",
            });
            break;
          case "invalid-captcha":
            toast({
              title: "reCAPTCHA verification error",
              description:
                "A technical issue occurred while verifying your request. Please try again, or contact support if the problem persists.",
              variant: "destructive",
            });
            break;
          case "unverified-byadmin":
            toast({
              title: "Please wait for admin approval",
              description: "Please wait for admin approval before signing in",
            });
            router.push(DEFAULT_SIGNIN_UNVERIFIED_REDIRECT);
            break;
          case "success":
            toast({
              title: "Success!",
              description: "You are now signed in",
            });
            localStorage.removeItem("loginAttempts");
            router.push(DEFAULT_SIGNIN_REDIRECT);
            break;
          default:
            toast({
              title: "Error signing in with password",
              description: "Please try again",
              variant: "destructive",
            });
        }

        if (message != "success") {
          const attempts =
            parseInt(localStorage.getItem("loginAttempts") || "0") + 1;
          localStorage.setItem("loginAttempts", attempts.toString());
          if (attempts >= 3) {
            setCaptchaNeeded(true);
          }
        }
      } catch (error) {
        console.error(error);
        toast({
          title: "Something went wrong",
          description: "Please try again",
          variant: "destructive",
        });
      }
    });
  }

  return (
    <Form {...form}>
      <form
        className="grid w-full gap-4"
        onSubmit={(...args) => void form.handleSubmit(onSubmit)(...args)}
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="johnsmith@gmail.com"
                  className="bg-white dark:bg-transparent"
                  {...field}
                />
              </FormControl>
              <FormMessage className="pt-2 sm:text-sm" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <PasswordInput
                  placeholder="********"
                  {...field}
                  className="bg-white dark:bg-transparent"
                />
              </FormControl>
              <FormMessage className="pt-2 sm:text-sm" />
            </FormItem>
          )}
        />

        {isUsingRecaptcha && captchaNeeded && (
          <ReCAPTCHA
            sitekey={env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
            onChange={(token: any) => setCaptchaToken(token)}
          />
        )}

        <Button disabled={isPending}>
          {isPending ? (
            <>
              <Icons.spinner
                className="mr-2 size-4 animate-spin"
                aria-hidden="true"
              />
              <span>Signing in...</span>
            </>
          ) : (
            <span>Sign in</span>
          )}
          <span className="sr-only">Sign in with email and password</span>
        </Button>
      </form>
    </Form>
  );
}
