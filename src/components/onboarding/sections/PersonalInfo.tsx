'use client'

import React from 'react'
import * as z from 'zod'

import SectionHeader from '../SectionHeader'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { cn } from '@/utils/utils'
import useStore from '@/stores/onboarding/useStore'
import Container from '../Container'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const formSchema = z.object({
  name: z.string().min(3, { message: 'Name is required' }).max(100),
  phone: z.string().refine((val) => /^(\+62|0)8\d{8,11}$/.test(val), {
    message: 'Phone number is invalid',
  }),
  surname: z.string().min(3, { message: 'Surname is required' }).max(100),
  username: z
    .string()
    .min(1, { message: 'Username is required' })
    .min(5, { message: 'Minimal 5 characters' })
    .max(100)
    .refine(
      async (username) => {
        const response = await fetch(`/api/user/username`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username }),
        })
        const data = await response.json()
        return !data.exists // If the username exists, return false
      },
      {
        message: 'Username already used',
      },
    ),
  address: z.string().min(5, { message: 'Address is required' }).max(1000),
})

type ValidationSchema = z.infer<typeof formSchema>

export default function PersonalInfo() {
  const { personalInfo, setPersonalInfo, increaseStep } = useStore((state) => state)
  const form = useForm<ValidationSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: { ...personalInfo },
  })
  const {
    control,
    formState: { errors },
  } = form

  const onSubmitHandler = (values: ValidationSchema) => {
    setPersonalInfo({ ...personalInfo, ...values })
    increaseStep(1)
  }

  return (
    <Container onNext={form.handleSubmit(onSubmitHandler)}>
      <SectionHeader
        title="Personal info"
        description="Please provide your detailed personal information"
      />
      <Form {...form}>
        <form className="flex flex-col gap-6" onSubmit={() => form.handleSubmit(onSubmitHandler)}>
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <FormField
              control={control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-c-primary-marine-blue flex items-center justify-between">
                    Name
                    <FormMessage>{errors.name?.message}</FormMessage>
                  </FormLabel>
                  <FormControl>
                    <Input
                      className={cn(
                        'placeholder:font-medium placeholder:text-c-neutral-cool-gray border-c-neutral-light-gray text-c-primary-marine-blue',
                        {
                          'border-c-primary-strawberry-red': errors.name?.message,
                        },
                      )}
                      placeholder="e.g. John"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="surname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-c-primary-marine-blue flex items-center justify-between">
                    Surname
                    <FormMessage>{errors.surname?.message}</FormMessage>
                  </FormLabel>
                  <FormControl>
                    <Input
                      className={cn(
                        'placeholder:font-medium placeholder:text-c-neutral-cool-gray border-c-neutral-light-gray text-c-primary-marine-blue',
                        {
                          'border-c-primary-strawberry-red': errors.surname?.message,
                        },
                      )}
                      placeholder="e.g. Doe"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <FormField
              control={control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-c-primary-marine-blue flex items-center justify-between">
                    Username
                    <FormMessage>{errors.username?.message}</FormMessage>
                  </FormLabel>
                  <FormControl>
                    <Input
                      className={cn(
                        'placeholder:font-medium placeholder:text-c-neutral-cool-gray border-c-neutral-light-gray text-c-primary-marine-blue',
                        {
                          'border-c-primary-strawberry-red': errors.username?.message,
                        },
                      )}
                      placeholder="e.g. johndoe123"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
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
                        'placeholder:font-medium placeholder:text-c-neutral-cool-gray border-c-neutral-light-gray text-c-primary-marine-blue',
                        {
                          'border-c-primary-strawberry-red': errors.phone?.message,
                        },
                      )}
                      placeholder="e.g. +62 812-3456-7890"
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
                  Address
                  <FormMessage>{errors.address?.message}</FormMessage>
                </FormLabel>
                <FormControl>
                  <Textarea
                    className={cn(
                      'placeholder:font-medium placeholder:text-c-neutral-cool-gray border-c-neutral-light-gray text-c-primary-marine-blue h-20',
                      {
                        'border-c-primary-strawberry-red': errors.address?.message,
                      },
                    )}
                    placeholder="e.g. Jl. Sudirman No. 10, Jakarta"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </form>
      </Form>
    </Container>
  )
}
