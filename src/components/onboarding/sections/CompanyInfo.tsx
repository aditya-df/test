"use client";

import React from "react";
import * as z from "zod";

import SectionHeader from "../SectionHeader";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/utils/utils";
import useStore from '@/stores/onboarding/useStore'
import Container from "../Container";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  name: z.string().min(3, { message: "Company Name is required" }).max(100),
  email: z.string().min(1, { message: "Company Email is required" }).email({
    message: "Must be a valid email",
  }).refine(
    async (emailcorp) => {
      const response = await fetch(`/api/user/username`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailcorp }),
      })
      const data = await response.json()
      return !data.exists // If the username exists, return false
    },
    {
      message: 'Corporate email already used',
    },
  ),
  // phone: z.string().refine((val) => /^(\+62|0)8\d{8,11}$/.test(val), {
  //   message: 'Phone number is invalid',
  // }),
  address: z.string().min(5, { message: "Address is required" }).max(1000),
});

type ValidationSchema = z.infer<typeof formSchema>;

export default function CompanyInfo() {
  const { companyInfo, setCompanyInfo, increaseStep, decreaseStep, step } = useStore(
    (state) => state
  );
  const form = useForm<ValidationSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: { ...companyInfo },
  });
  const {
    control,
    formState: { errors },
  } = form;

  const onSubmitHandler = (values: ValidationSchema) => {
    setCompanyInfo({ ...companyInfo, ...values });
    increaseStep(step);
  };

  const onPrevious = () => {
    decreaseStep(step);
  };

  return (
    <Container onNext={form.handleSubmit(onSubmitHandler)} onPreviousStep={onPrevious}>
      <SectionHeader
        title="Company Info"
        description="Please provide your detailed company information."
      />

      <Form {...form}>
        <form
          className="flex flex-col gap-6"
          onSubmit={() => form.handleSubmit(onSubmitHandler)}
        >
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <FormField
              control={control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-c-primary-marine-blue flex items-center justify-between">
                    Company Name
                    <FormMessage>{errors.name?.message}</FormMessage>
                  </FormLabel>
                  <FormControl>
                    <Input
                      className={cn(
                        "placeholder:font-medium placeholder:text-c-neutral-cool-gray border-c-neutral-light-gray text-c-primary-marine-blue",
                        {
                          "border-c-primary-strawberry-red": errors.name?.message,
                        }
                      )}
                      placeholder="e.g. ABC Corporation"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-c-primary-marine-blue flex items-center justify-between">
                    Company Email
                    <FormMessage>{errors.email?.message}</FormMessage>
                  </FormLabel>
                  <FormControl>
                    <Input
                      className={cn(
                        "placeholder:font-medium placeholder:text-c-neutral-cool-gray border-c-neutral-light-gray text-c-primary-marine-blue",
                        {
                          "border-c-primary-strawberry-red":
                            errors.email?.message,
                        }
                      )}
                      placeholder="e.g. contact@abccorp.com"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-c-primary-marine-blue flex items-center justify-between">
                  Company Address
                  <FormMessage>{errors.address?.message}</FormMessage>
                </FormLabel>
                <FormControl>
                  <Textarea
                    className={cn(
                      "placeholder:font-medium placeholder:text-c-neutral-cool-gray border-c-neutral-light-gray text-c-primary-marine-blue h-20",
                      {
                        "border-c-primary-strawberry-red":
                          errors.address?.message,
                      }
                    )}
                    placeholder="e.g. Jl. Thamrin No. 20, Jakarta"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          {/* <FormField
            control={control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-c-primary-marine-blue flex items-center justify-between">
                  Phone Number
                  <FormMessage>{errors.phone?.message}</FormMessage>
                </FormLabel>
                <FormControl>
                  <Input
                    className={cn(
                      "placeholder:font-medium placeholder:text-c-neutral-cool-gray border-c-neutral-light-gray text-c-primary-marine-blue",
                      {
                        "border-c-primary-strawberry-red":
                          errors.phone?.message,
                      }
                    )}
                    placeholder="e.g. +62 21-1234-5678"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          /> */}
        </form>
      </Form>
    </Container>
  );
}
