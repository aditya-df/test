"use client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Toaster } from "@/components/ui/toaster";
import { Bot, Building2, LayoutGrid, SquareLibrary } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import React from "react";

interface PrototypeLayoutProps {
  children: React.ReactNode;
}

export const Sidebar = ({ children }: PrototypeLayoutProps) => {
  const { data: session } = useSession();
  return (
    <div className="bg-background">
      <div className="grid grid-cols-12 h-screen">
        <div className="col-span-2 h-full bg-white p-4 flex flex-col">
          <div className="space-y-4 space-x-4 w-full">
            <div className="flex justify-center flex-col items-center">
              <Image src="/km/Logo.png" alt="logo" width={100} height={90} />
              <Card className="flex flex-row items-center justify-center gap-3 rounded-lg w-fit p-3 mt-6 ">
                <Avatar>
                  <AvatarFallback>AM</AvatarFallback>
                </Avatar>
                <h1 className="break-words">{session?.user?.name}</h1>
              </Card>
            </div>
          </div>
          <nav className="mt-10 flex-1">
            <ul className="space-y-5">
              <li>
                <Link
                  href="/dashboard"
                  className="flex py-2.5 px-4 hover:text-primary flex-row gap-2"
                >
                  <LayoutGrid />
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/company-management"
                  className="flex py-2.5 px-4 hover:text-primary flex-row gap-2"
                >
                  <Building2 />
                  Company Management
                </Link>
              </li>
              <li>
                <Link
                  href="/knowledge"
                  className="flex py-2.5 px-4 hover:text-primary flex-row gap-2"
                >
                  <SquareLibrary />
                  Knowledge
                </Link>
              </li>
              <li>
                <Link
                  href="/chatbot"
                  className="flex py-2.5 px-4 hover:text-primary flex-row gap-2"
                >
                  <Bot />
                  Chatbot
                </Link>
              </li>
            </ul>
          </nav>
          <div className="p-4">
            <Button
              variant="destructive"
              className="w-full"
              onClick={async () => {
                await signOut({ callbackUrl: "/" });
              }}
            >
              Logout
            </Button>
          </div>
        </div>
        <div className="col-span-10 p-14 flex-1 mb-4 h-full align-center overflow-y-auto">
          {children}
          <Toaster />
        </div>
      </div>
    </div>
  );
};
