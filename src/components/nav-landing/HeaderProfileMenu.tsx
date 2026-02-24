"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/utils/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SignOutButton } from "@/features/auth/components/signout-button";
import { Icons } from "@/components/icons";
import {
  Dialog,
  DialogContent,
  DialogPortal,
  DialogOverlay,
  DialogTitle,
  DialogClose,
  DialogDescription,
} from "@radix-ui/react-dialog";
import {
  Badge,
  Building2,
  CheckCircle,
  LayoutGrid,
  Lock,
  EyeOff,
  Eye,
  NotebookTabs,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { DialogHeader } from "../ui/dialog";
import { useStore } from "@/stores/users/useStore";
import { useStore as organizationStore } from "@/stores/organization/useStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Joyride, { CallBackProps, EVENTS, STATUS, Step } from "react-joyride";
import { getMenuList } from "@/utils/menu-list";
import { usePathname } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { LinkGoogleAccount } from "../account/link-google";
import { Session } from "next-auth";
import { acl, MenuType, SystemSettings } from "@prisma/client";
import React from "react";
import { Separator } from "../ui/separator";
import { NewMenuMobile } from "../dashboard/new-menu-mobile";

const createValidSelector = (label: string) => {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

// Then in your MobileNav component:
const MobileNav = ({ session }: { session: Session | null }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isBaznasTheme = process.env.NEXT_PUBLIC_BAZNAS_THEME === "true";

  // Close the menu when an item is clicked
  const handleItemClick = () => {
    setIsOpen(false);
  };

  if (!session) return null;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild className="lg:hidden">
        <Button variant="ghost" size="icon">
          <Menu className={cn("h-5 w-5", isBaznasTheme ? "text-white" : "")} />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className={cn(
          "w-[300px] sm:w-[400px] p-0",
          isBaznasTheme ? "bg-[#ecfff6] dark:bg-background" : "",
        )}
      >
        {/* Header with logo */}
        <div
          className={cn(
            "flex items-center p-4 border-b border-gray-100 dark:border-gray-800",
            isBaznasTheme ? "bg-[#ecfff6] dark:bg-background" : "",
          )}
        >
          <Link
            href="/"
            className="flex items-center gap-2"
            onClick={handleItemClick}
          >
            <img
              src="/km/favicon/small-new-knowgen-logo.png"
              className="size-8"
              alt="Knowgen.AI"
            />
            <span className="bg-linear-to-r from-blue-600 to-purple-400 bg-clip-text font-extrabold text-transparent">
              Knowgen.AI
            </span>
          </Link>
        </div>

        {/* Use the mobile-optimized menu */}
        <div className="h-[calc(100vh-65px)] overflow-hidden">
          <NewMenuMobile onItemClick={handleItemClick} />
        </div>
      </SheetContent>
    </Sheet>
  );
};

const getMenuItemContent = (label: string) => {
  switch (label) {
    case "Chatbot":
      return "Engage in real-time conversations with users through an AI-powered chatbot, designed to handle queries and provide solutions efficiently.";
    case "Agent":
      return "Create and manage AI agents that act as virtual assistants, handling specific tasks and delivering personalized responses.";
    case "Knowledge Base":
      return "Enhance chatbot performance by adding and managing knowledge base, improving the AI's ability to understand and respond to various user inputs.";
    case "User Management":
      return "Easily manage users, track their interactions, and assign permissions to ensure a smooth and secure experience within the app.";
    case "Invited Users":
      return "Track invitation status, resend invites, and onboard users seamlessly for an enhanced collaborative experience.";
    case "ACL Management":
      return "Use Access Control Lists (ACL) to set specific access levels, ensuring secure and efficient management of resources across your organization.";
    default:
      return `This is the ${label} menu item`;
  }
};

type HeaderClientProps = {
  session: Session | null;
  isDashboard: boolean;
  systemSetting?: SystemSettings | null;
  authMethods?: any;
};

export function HeaderClient({
  session,
  isDashboard,
  systemSetting,
  authMethods,
}: HeaderClientProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newPasswordError, setNewPasswordError] = useState<string | null>(null);
  //const hasGoogleAccount = user?.accounts?.some(account => account.provider === 'google');
  const { getDetail, selectedData: user } = useStore();
  const { getDetail: orgGetDetail, selectedData: org } = organizationStore();
  const { menuTypes } = useMemo(() => {
    const aclList: acl[] = session?.user?.acl ?? [];
    // Filter out null values directly
    const menuTypes = aclList
      .map((item) => item.menuType)
      .filter((type) => type !== null) as MenuType[];
    return { menuTypes };
  }, [session?.user?.acl]);
  const pathname = usePathname();
  const menuList = useMemo(
    () => getMenuList(pathname, menuTypes),
    [pathname, menuTypes],
  );

  const [runTour, setRunTour] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const { toast } = useToast();
  // const hasGoogleAccount = user?.accounts?.some(account => account.provider === 'google');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (session?.user?.email) {
      getDetail(session.user.email);
    }
  }, [session?.user?.email, getDetail]);

  useEffect(() => {
    if (user && user.organization && user.organization.length > 0) {
      const organizationId = user.organization[0]?.organizationId;
      if (organizationId) {
        orgGetDetail(organizationId);
      }
    }
  }, [user, orgGetDetail]);

  const validatePassword = (password: string) => {
    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*]/.test(password);
    const isLongEnough = password.length >= 8;

    if (!isLongEnough) return "Password must be at least 8 characters long";
    if (!hasLowerCase) return "Password must contain a lowercase letter";
    if (!hasUpperCase) return "Password must contain an uppercase letter";
    if (!hasNumber) return "Password must contain a number";
    if (!hasSpecialChar) return "Password must contain a special character";
    return null;
  };

  const handleTimeOutChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const timeoutMinutes = parseInt(formData.get("timeout") as string, 10);
    const warningSeconds = parseInt(formData.get("warning") as string, 10);

    // Validation
    if (isNaN(timeoutMinutes) || timeoutMinutes < 1) {
      toast({
        variant: "destructive",
        title: "Invalid timeout value",
        description: "Please enter a valid number of minutes (minimum 1)",
      });
      return;
    }

    if (isNaN(warningSeconds) || warningSeconds < 1) {
      toast({
        variant: "destructive",
        title: "Invalid warning time",
        description: "Please enter a valid number of seconds (minimum 1)",
      });
      return;
    }

    try {
      // Convert minutes to seconds for the API
      const timeoutSeconds = timeoutMinutes * 60;

      const response = await fetch("/api/timeout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timeout: timeoutSeconds,
          warning: warningSeconds,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update timeout");
      }

      toast({
        title: "Success",
        description: `Session timeout settings updated successfully`,
      });

      setIsSettingsDialogOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update session timeout settings : " + error,
      });
    }
  };

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const oldPassword = formData.get("current-password") as string;
    const newPassword = formData.get("new-password") as string;
    const confirmPassword = formData.get("confirm-password") as string;

    // Validate new password format
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setNewPasswordError(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setPasswordError("");
    setNewPasswordError(null);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/user/password`,
      {
        method: "POST",
        headers: {
          "Content-type": "application/json",
        },
        body: JSON.stringify(
          user.passwordHash
            ? { newpassword: newPassword, password: oldPassword }
            : { newpassword: newPassword },
        ),
        cache: "no-cache",
      },
    );

    const data = await response.json();

    if (data.message === "Password updated successfully") {
      toast({
        title: "Success",
        description: user.passwordHash
          ? "Your password has been updated successfully."
          : "Your password has been set successfully.",
      });
      setIsPasswordDialogOpen(false);
      window.location.reload();
    } else if (data.message === "Old Password is not valid") {
      toast({
        title: "Error",
        description: `Failed to update password ${data.message}. Please try again.`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to update password. Please try again.",
        variant: "destructive",
      });
    }

    // setIsPasswordDialogOpen(false)
    // window.location.reload()
  };

  const steps: Step[] = useMemo(() => {
    return menuList.flatMap((group) =>
      group.menus.map((menu) => ({
        target: `.menu-item-${createValidSelector(menu.label)}`,
        content: getMenuItemContent(menu.label),
        disableBeacon: true,
        placement: "right",
      })),
    );
  }, [menuList]);

  const handleJoyrideCallback = useCallback(
    async (data: CallBackProps) => {
      const { status, type, index, action } = data;

      switch (status) {
        case STATUS.FINISHED:
        case STATUS.SKIPPED:
          setRunTour(false);
          break;

        default:
          switch (type) {
            case EVENTS.STEP_AFTER:
            case EVENTS.TARGET_NOT_FOUND:
              let nextIndex = index;
              if (action === "prev") {
                nextIndex = index - 1;
              } else if (action === "next") {
                nextIndex = index + 1;
              }

              if (nextIndex >= 0 && nextIndex < steps.length) {
                setStepIndex(nextIndex);
              } else {
                setRunTour(false);
              }
              break;
            case EVENTS.TOUR_START:
              setStepIndex(index);
              break;
            default:
              break;
          }
      }
    },
    [steps.length],
  );

  return (
    <>
      {isDashboard && <MobileNav session={session} />}
      {session?.user ? (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger
              asChild
              className={cn(
                buttonVariants({ variant: "user", size: "icon" }),
                "transition-all duration-300 ease-in-out hover:opacity-70",
              )}
            >
              <Avatar className="size-9 cursor-pointer">
                {user?.image ? (
                  <AvatarImage
                    src={user.image}
                    alt={user.name ?? "user's profile picture"}
                    className="size-7 rounded-full"
                  />
                ) : (
                  <AvatarFallback className="size-9 cursor-pointer p-1.5 text-xs capitalize">
                    <Icons.user className="size-5 rounded-full" />
                  </AvatarFallback>
                )}
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.name}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => setIsDialogOpen(true)}>
                  <Icons.avatar className="mr-2 size-4" aria-hidden="true" />
                  Account
                </DropdownMenuItem>
                {authMethods?.password && (
                  <>
                    {user?.passwordHash !== null ? (
                      <DropdownMenuItem
                        onSelect={() => setIsPasswordDialogOpen(true)}
                      >
                        <Lock className="mr-2 size-4" aria-hidden="true" />
                        Change Password
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onSelect={() => setIsPasswordDialogOpen(true)}
                      >
                        <Lock className="mr-2 size-4" aria-hidden="true" />
                        Add Password
                      </DropdownMenuItem>
                    )}
                    {session?.user?.provider !== "google" && (
                      <DropdownMenuItem>
                        <LinkGoogleAccount />
                      </DropdownMenuItem>
                    )}
                  </>
                )}
                <DropdownMenuItem className="hover:cursor-pointer" asChild>
                  <Link
                    href="/docs"
                    className="flex items-center -ml-[4px] md:-ml-0"
                  >
                    <NotebookTabs className="w-4 h-4 mr-3 text-muted-foreground" />
                    API Integration Docs
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:cursor-pointer" asChild>
                  <Link
                    href="/dashboard"
                    className="flex items-center -ml-[4px] md:-ml-0"
                  >
                    <LayoutGrid className="w-4 h-4 mr-3 text-muted-foreground" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                {/* {(session?.user?.roles?.includes("admin") ||
                  session?.user?.roles?.includes("superadmin")) && (
                  <DropdownMenuItem
                    onSelect={() => setIsSettingsDialogOpen(true)}
                  >
                    <Settings className="w-4 h-4 mr-3 text-muted-foreground" />
                    Settings
                  </DropdownMenuItem>
                )} */}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <SignOutButton />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogPortal>
              <DialogOverlay className="fixed inset-0 bg-black/50 dark:bg-black/70 z-100" />
              <DialogContent
                onClick={() => setIsDialogOpen(false)}
                className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-950 rounded-lg p-6 sm:max-w-[625px] w-full z-101"
              >
                <DialogHeader>
                  <DialogTitle className="sr-only">User Profile</DialogTitle>
                </DialogHeader>
                <div
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsDialogOpen(true);
                  }}
                  className="grid gap-4 py-4"
                >
                  <Card className="dark:bg-gray-900">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        Personal Information
                        {user?.isVerified && (
                          <Badge className="ml-2">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-4 mb-4">
                        <Avatar className="w-20 h-20">
                          <AvatarImage
                            src={
                              session?.user?.image ||
                              "/placeholder.svg?height=80&width=80"
                            }
                            alt={`${user?.name || ""} ${user?.surname || ""}`}
                          />
                          <AvatarFallback>
                            {user?.name?.[0] || ""}
                            {user?.surname?.[0] || ""}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h2 className="text-2xl font-semibold">
                            {user?.name || ""} {user?.surname || ""}
                          </h2>
                          <p className="text-muted-foreground">
                            @{user?.username}
                          </p>
                        </div>
                      </div>
                      <dl className="grid grid-cols-1 gap-2 text-sm">
                        <div className="grid grid-cols-2">
                          <dt className="font-medium">Email:</dt>
                          <dd className="break-all">{user?.email}</dd>
                        </div>
                        {/* <div className="grid grid-cols-2">
                          <dt className="font-medium">Phone:</dt>
                          <dd>{user?.phone}</dd>
                        </div>
                        <div className="grid grid-cols-2">
                          <dt className="font-medium">Address:</dt>
                          <dd>{user?.address}</dd>
                        </div> */}
                        <div className="grid grid-cols-2">
                          <dt className="font-medium">Onboarding:</dt>
                          <dd>
                            {user?.onboardingCompleted
                              ? "Completed"
                              : "Pending"}
                          </dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>

                  <Card className="dark:bg-gray-900">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        Organizational Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="grid grid-cols-1 gap-2 text-sm">
                        <div className="grid grid-cols-2">
                          <dt className="font-medium">Company:</dt>
                          <dd>{org?.name}</dd>
                        </div>
                        <div className="grid grid-cols-2">
                          <dt className="font-medium">Email:</dt>
                          <dd className="break-all">{org?.email}</dd>
                        </div>
                        <div className="grid grid-cols-2">
                          <dt className="font-medium">Phone:</dt>
                          <dd>{org?.phone}</dd>
                        </div>
                        <div className="grid grid-cols-2">
                          <dt className="font-medium">Address:</dt>
                          <dd>{org?.address}</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>
                </div>
              </DialogContent>
            </DialogPortal>
          </Dialog>

          <Dialog
            open={isPasswordDialogOpen}
            onOpenChange={setIsPasswordDialogOpen}
          >
            <DialogPortal>
              <DialogOverlay className="fixed inset-0 bg-black/50 dark:bg-black/70 z-100" />
              <DialogContent className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-950 rounded-lg p-6 sm:max-w-[425px] w-full z-101">
                <DialogHeader>
                  <DialogTitle>
                    {user?.passwordHash !== null
                      ? "Change Password"
                      : "Add Password"}
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-xs text-muted-foreground font-normal">
                    {user?.passwordHash !== null
                      ? "Update your password to enhance your account security."
                      : "Create a password to secure your account."}
                  </DialogDescription>
                </DialogHeader>
                <Separator className="my-4" />
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  {user?.passwordHash !== null && (
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <div className="relative">
                        <Input
                          id="current-password"
                          name="current-password"
                          type={showCurrentPassword ? "text" : "password"}
                          required
                          className="dark:bg-gray-800"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowCurrentPassword(!showCurrentPassword)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        name="new-password"
                        type={showNewPassword ? "text" : "password"}
                        required
                        className="dark:bg-gray-800"
                        onChange={(e) =>
                          setNewPasswordError(validatePassword(e.target.value))
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        )}
                      </button>
                    </div>
                    {newPasswordError && (
                      <p className="text-sm text-amber-600 dark:text-amber-500">
                        {newPasswordError}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Password must contain at least 8 characters, including
                      uppercase, lowercase, number and special character
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">
                      Confirm New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        name="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        className="dark:bg-gray-800"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        )}
                      </button>
                    </div>
                    {passwordError && (
                      <p className="text-sm text-red-500 dark:text-red-400">
                        {passwordError}
                      </p>
                    )}
                  </div>
                  <div className="flex justify-end space-x-2">
                    <DialogClose asChild>
                      <Button type="button" variant="outline">
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button type="submit">
                      {user?.passwordHash !== null
                        ? "Change Password"
                        : "Add Password"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </DialogPortal>
          </Dialog>

          {/* Setting Dialog */}
          <Dialog
            open={isSettingsDialogOpen}
            onOpenChange={setIsSettingsDialogOpen}
          >
            <DialogPortal>
              <DialogOverlay className="fixed inset-0 bg-black/50 dark:bg-black/70 z-100" />
              <DialogContent className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-950 rounded-lg p-6 sm:max-w-[425px] w-full z-101">
                {/* <DialogHeader>
                  <DialogTitle>Session Timeout Settings</DialogTitle>
                </DialogHeader> */}
                <DialogHeader>
                  <DialogTitle>Session Timeout Settings</DialogTitle>
                  <DialogDescription className="mt-1 text-xs text-muted-foreground font-normal">
                    Set the session timeout for your account. If you do not log
                    in within this time, your account will be logged out
                    automatically.
                  </DialogDescription>
                </DialogHeader>
                <Separator className="my-4" />
                <form onSubmit={handleTimeOutChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="timeout">
                      Session Timeout (in minutes)
                    </Label>
                    <div className="relative">
                      <Input
                        id="timeout"
                        name="timeout"
                        type="number"
                        min="1"
                        placeholder="Enter timeout in minutes"
                        defaultValue={
                          systemSetting?.sessionTimeout
                            ? Math.floor(systemSetting.sessionTimeout / 60)
                            : 10
                        }
                        required
                        className="dark:bg-gray-800"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Set the duration of user inactivity before automatic
                      logout (in minutes)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="warning">Warning Time (in seconds)</Label>
                    <div className="relative">
                      <Input
                        id="warning"
                        name="warning"
                        type="number"
                        min="1"
                        placeholder="Enter warning time in seconds"
                        defaultValue={systemSetting?.warningTime ?? 30}
                        required
                        className="dark:bg-gray-800"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Set how many seconds before timeout to show warning (in
                      seconds)
                    </p>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <DialogClose asChild>
                      <Button type="button" variant="outline">
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button type="submit">Save Changes</Button>
                  </div>
                </form>
              </DialogContent>
            </DialogPortal>
          </Dialog>

          {isMounted && (
            <Joyride
              steps={steps}
              run={runTour}
              continuous
              showSkipButton
              showProgress
              callback={handleJoyrideCallback}
              stepIndex={stepIndex}
              styles={{
                options: {
                  zIndex: 10000,
                },
              }}
              // floaterProps={{
              //   // disableAnimation: true,
              // }}
              disableOverlayClose={true}
              disableCloseOnEsc={true}
              hideCloseButton={true}
              spotlightClicks={false}
              locale={{
                last: "Finish",
              }}
            />
          )}
        </>
      ) : null}
    </>
  );
}
