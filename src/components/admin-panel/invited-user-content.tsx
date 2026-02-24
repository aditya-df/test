"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader } from "../ui/card";
import { Input } from "../ui/input";
import { Dialog, DialogTrigger } from "../ui/dialog";
import { Button } from "../ui/button";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Badge } from "../ui/badge";
import {
  Lock,
  UserPlus,
  // Users,
  Search,
  Plus,
  Mail,
  Shield,
  RefreshCw,
  Clock,
  Calendar,
  Key,
  Crown,
} from "lucide-react";
import { CheckCRUDPermission } from "@/utils/access-check";
import TagInput from "../tag-input";
import TableComponent from "@/components/layouts/table";
import { ColDef } from "ag-grid-community";
import { toast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { usePaginationTable } from "@/hooks/use-pagination-table";
import { PaginationComponent } from "../ui/pagination/pagination-component";
import { useRouter } from 'next/navigation'
import TableSkeleton from "../skeleton/table";

interface Tag {
  id: string;
  text: string;
}

interface InvitedUserContentProps {
  organizationId: string;
  hasAccess: boolean;
  session: any;
  MENU_CONST: string;
}

interface InvitedUser {
  email: string;
  token: string;
  organizationId: string;
  expires: string;
  createdAt: string;
  userId?: string; // Use userId instead of invitedBy
  User?: {         // Use User instead of inviter
    id: string;
    name?: string;
    email?: string;
    image?: string;
  };
}

export default function InvitedUserContent({
  organizationId,
  hasAccess,
  MENU_CONST,
  session,
}: InvitedUserContentProps) {
  const router = useRouter()
  const canCreate = CheckCRUDPermission(session, MENU_CONST, "create");
  const canView = CheckCRUDPermission(session, MENU_CONST, "read");

  const hasValidAccess = hasAccess && canView
  const [countdown, setCountdown] = useState<number | null>(null)
  const [isRedirecting, setIsRedirecting] = useState(false)

  // Check if user is on trial
  const isTrialUser = session?.user?.userType === 'TRIAL';

  // Trial user restriction - show upgrade message
  if (isTrialUser) {
    return (
      <Card className="w-full mt-6 shadow-sm">
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 bg-amber-100 dark:bg-amber-900/20 rounded-full">
              <Crown className="w-12 h-12 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Premium Feature
              </h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-md">
                User invitations are available for Premium users only.
                Upgrade your account to invite team members to your organization.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Lock className="w-4 h-4" />
              <span>Trial Account Limitation</span>
            </div>
            <Button className="mt-4" variant="default">
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to Premium
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  useEffect(() => {
    if (!hasValidAccess && countdown === null && !isRedirecting) {
      setCountdown(5)
      setIsRedirecting(true)
    }
  }, [hasValidAccess, countdown, isRedirecting])

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null

    if (!hasValidAccess && countdown !== null && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            // Redirect when countdown reaches 0
            router.push('/dashboard')
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    // Cleanup timer
    return () => {
      if (timer) {
        clearInterval(timer)
      }
    }
  }, [hasValidAccess, countdown, router])

  // Enhanced access control check
  if (!hasValidAccess) {
    return (
      <Card className="w-full mt-6 shadow-sm">
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full">
              <Shield className="w-12 h-12 text-red-600 dark:text-red-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Access Restricted
              </h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-md">
                You don&apos;t have the necessary permissions to view User Invitations.
                Please contact your administrator if you believe
                this is an error.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Lock className="w-4 h-4" />
              <span>Required permission: Read Access</span>
            </div>
            {countdown !== null && countdown >= 0 && (
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 animate-in fade-in duration-300">
                <div className="flex items-center justify-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                    <p className="text-blue-800 dark:text-blue-200 font-medium">
                      Redirecting to dashboard in
                    </p>
                  </div>
                  <span className="inline-flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full font-bold text-xl transition-all duration-300 transform hover:scale-105">
                    {countdown}
                  </span>
                  <span className="text-blue-800 dark:text-blue-200 font-medium">
                    second{countdown !== 1 ? 's' : ''}...
                  </span>
                </div>
                {countdown === 0 && (
                  <div className="mt-2 text-center">
                    <div className="inline-flex items-center gap-2 text-blue-700 dark:text-blue-300">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm">Redirecting...</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const [totalItems, setTotalItems] = useState(0);
  const [invitedUsers, setInvitedUsers] = useState<InvitedUser[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | null>(
    null
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [resendingEmails, setResendingEmails] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const pagination = usePaginationTable({ totalItems: totalItems || 0 })

  const tableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleClose = () => {
    setIsOpen(false);
    setTags([]); // Reset tags when closing
    setFeedbackMessage(null);
  };

  const filteredInvitedUsers = useMemo(() => {
    if (!debouncedSearchQuery || !invitedUsers) return invitedUsers;

    return invitedUsers.filter((user) =>
      user.email.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );
  }, [invitedUsers, debouncedSearchQuery]);

  const fetchInvitations = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/organization/${organizationId}/invite?limit=${pagination.pageSize}&offset=${((pagination.currentPage - 1) * pagination.pageSize)}`,
        {
          method: "GET",
        }
      );
      const data = await response.json();
      setInvitedUsers(data.data || []);
      setTotalItems(data.totals || 0);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      setFeedbackMessage("Error fetching invitations.");
      setFeedbackType("error");
      toast({
        title: "Error",
        description: "Failed to fetch invitations.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, pagination.currentPage, pagination.pageSize]);

  const handleInvite = async (emailsToInvite?: string[]) => {
    try {
      const emails = emailsToInvite || tags.map((tag) => tag.text);
      if (emails.length === 0) {
        console.warn("No emails to invite.");
        setFeedbackMessage("No emails to invite.");
        setFeedbackType("error");
        toast({
          title: "Error",
          description: "No emails to invite.",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }

      if (emailsToInvite) {
        setResendingEmails(prev => [...prev, ...emailsToInvite]);
      } else {
        setIsUpdating(true);
      }

      const response = await fetch(
        `/api/organization/${organizationId}/invite`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ emails }),
        }
      );

      if (response.ok) {
        await fetchInvitations();

        if (!emailsToInvite) {
          setTags([]);
          setIsOpen(false);
        }
        setFeedbackMessage("Invitation(s) sent successfully.");
        setFeedbackType("success");
        toast({
          title: "Success",
          description: emailsToInvite
            ? "Invitation resent successfully."
            : "Invitation(s) sent successfully.",
          duration: 3000,
        });
      } else {
        setFeedbackMessage("Failed to send invitation(s).");
        setFeedbackType("error");
        toast({
          title: "Error",
          description: "Failed to send invitation(s).",
          variant: "destructive",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Error sending invitation(s):", error);
      setFeedbackMessage("An error occurred while sending invitations.");
      setFeedbackType("error");
      toast({
        title: "Error",
        description: "An error occurred while sending invitations.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      if (emailsToInvite) {
        setResendingEmails(prev => prev.filter(email => !emailsToInvite.includes(email)));
      } else {
        setIsUpdating(false);
      }
    }
  };

  // Setup wheel and touch handlers for table scrolling
  useEffect(() => {
    const tableAreaContainer = tableContainerRef.current;
    if (tableAreaContainer) {
      const handleWheel = (e: WheelEvent) => {
        const agBodyViewport =
          tableAreaContainer.querySelector(".ag-body-viewport");
        if (agBodyViewport) {
          agBodyViewport.scrollTop += e.deltaY;
        }
      };
      tableAreaContainer.addEventListener("wheel", handleWheel, {
        passive: true,
      });
      return () => tableAreaContainer.removeEventListener("wheel", handleWheel);
    }
  }, []);

  useEffect(() => {
    const tableAreaContainer = tableContainerRef.current;
    if (tableAreaContainer) {
      let startY: number;

      const handleTouchStart = (e: TouchEvent) => {
        startY = e.touches[0]?.clientY ?? 0;
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (e.touches[0]) {
          const deltaY = startY - e.touches[0].clientY;
          const agBodyViewport =
            tableAreaContainer.querySelector(".ag-body-viewport");
          if (agBodyViewport) {
            agBodyViewport.scrollTop += deltaY;
          }
          startY = e.touches[0].clientY;
        }
      };

      tableAreaContainer.addEventListener("touchstart", handleTouchStart, {
        passive: true,
      });
      tableAreaContainer.addEventListener("touchmove", handleTouchMove, {
        passive: true,
      });

      return () => {
        tableAreaContainer.removeEventListener("touchstart", handleTouchStart);
        tableAreaContainer.removeEventListener("touchmove", handleTouchMove);
      };
    }
  }, []);

  // Use useMemo for column definitions to prevent recreation on every render
  const columnDefs = useMemo<ColDef[]>(() => [
    {
      field: "email",
      headerName: "Email",
      width: 250,
      cellRenderer: (props: any) => {
        if (!props || !props.value) {
          return <span className="text-gray-400 italic">No email</span>;
        }

        return (
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Badge variant="outline" className="bg-background truncate">
              {props.value}
            </Badge>
          </div>
        );
      },
    },
    {
      field: "token",
      headerName: "Token",
      width: 200,
      cellRenderer: (props: any) => {
        if (!props || !props.value) {
          return <span className="text-gray-400 italic">No token</span>;
        }

        const handleCopyToken = async (e: React.MouseEvent) => {
          e.stopPropagation();
          try {
            await navigator.clipboard.writeText(props.value);
            toast({
              title: "Token Copied",
              description: "Invitation token has been copied to clipboard.",
              duration: 2000,
            });
          } catch (error) {
            console.error("Failed to copy token:", error);
            toast({
              title: "Copy Failed",
              description: "Failed to copy token to clipboard.",
              variant: "destructive",
              duration: 3000,
            });
          }
        };

        return (
          <div className="flex items-center gap-2 w-full">
            <Key className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded truncate max-w-[150px] cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    {props.value}
                  </code>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs font-mono break-all max-w-xs">{props.value}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyToken}
                    className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                    </svg>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Copy token</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      },
    },
    {
      field: "userId",
      headerName: "Invited By",
      width: 200,
      cellRenderer: (props: any) => {
        const user = props.data.User;

        if (!user) {
          return (
            <div className="py-2 text-xs text-muted-foreground">
              Unknown User
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {user.name || 'No Name'}
              </span>
              {user.email && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {user.email}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      field: "expires",
      headerName: "Expires At",
      width: 180,
      cellRenderer: (props: any) => {
        if (!props || !props.value) {
          return <span className="text-gray-400 italic">No expiry</span>;
        }

        const expiryDate = new Date(props.value);
        const now = new Date();
        const isExpired = expiryDate < now;

        return (
          <div className="flex items-center gap-2">
            <Clock className={`h-4 w-4 flex-shrink-0 ${isExpired ? "text-red-500" : "text-muted-foreground"}`} />
            <span className={`text-sm ${isExpired ? "text-red-600 dark:text-red-400" : ""}`}>
              {expiryDate.toLocaleDateString()}
            </span>
            {isExpired && (
              <Badge variant="destructive" className="text-xs ml-1">
                Expired
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      field: "createdAt",
      headerName: "Invited At",
      width: 160,
      cellRenderer: (props: any) => {
        if (!props || !props.value) {
          return <span className="text-gray-400 italic">Unknown</span>;
        }

        return (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm">
              {new Date(props.value).toLocaleDateString()}
            </span>
          </div>
        );
      },
    },
    {
      field: "action",
      headerName: "Action",
      width: 120,
      cellRenderer: (props: any) => {
        if (!props || !props.data || !props.data.email) {
          return (
            <div className="flex items-center justify-center space-x-2">
              <span className="text-xs text-muted-foreground">
                Invalid data
              </span>
            </div>
          );
        }

        const isResending = resendingEmails.includes(props.data.email);

        return (
          <div className="flex items-center justify-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInvite([props.data.email]);
                    }}
                    disabled={isResending || isUpdating}
                    className="h-8 px-3 text-xs"
                  >
                    {isResending ? (
                      <>
                        <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                        Resending...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Resend
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Resend invitation email</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      },
    },
  ], [resendingEmails, isUpdating, handleInvite]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  return (
    <Card className="w-full mt-6 shadow-sm rounded-lg border">
      <CardHeader className="border-b rounded-t-lg bg-gray-50 dark:bg-zinc-950">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Invited Users
            </h1>
            <CardDescription>
              Manage invited users for your organization
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {canCreate && (
              <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    <span>Invite User</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5" />
                      Invite Users
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* ✅ NEW: Warning message about Gmail limits */}
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <svg
                          className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div className="text-xs text-amber-800 dark:text-amber-200">
                          <strong>Important:</strong> Maximum 10 invitations at once. Each email takes ~2-3 seconds to send to comply with Gmail rate limits and avoid blocking.
                        </div>
                      </div>
                    </div>

                    <TagInput
                      tags={tags}
                      setTags={setTags}
                      placeholder="Add email address & press enter or space..."
                      maxTags={10} // ✅ NEW: Set maximum to 10
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => handleInvite()}
                      disabled={tags.length === 0 || isUpdating}
                    >
                      {isUpdating ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          Sending...
                        </>
                      ) : (
                        "Invite"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {/* Feedback Message */}
        {feedbackMessage && (
          <div
            className={`mb-4 p-4 rounded ${feedbackType === "success"
              ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
              : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
              }`}
          >
            {feedbackMessage}
          </div>
        )}

        <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by email..."
              className="pl-10"
              aria-label="Search Invited Users by Email"
            />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {filteredInvitedUsers?.length || 0} Invitations
            </Badge>
          </div>
        </div>

        {/* Show skeleton only during initial load when we have no data */}
        {isLoading && (!invitedUsers || invitedUsers.length === 0) ? (
          <TableSkeleton columnDefs={columnDefs} />
        ) : (
          <>
            <div className="rounded-lg overflow-hidden">
              <div ref={tableContainerRef} className="w-full">
                <TableComponent
                  key={`invited-users-table-${filteredInvitedUsers?.length || 0}`}
                  loading={isLoading || isUpdating}
                  rowData={filteredInvitedUsers}
                  columnDefs={columnDefs}
                  suppressLoadingOverlay={false}
                  animateRows={false}
                  onGridReady={() => {
                    console.log(
                      "Invited Users Grid ready with data:",
                      filteredInvitedUsers?.length || 0,
                      "invitations"
                    );

                    if (filteredInvitedUsers) {
                      const invalidItems = filteredInvitedUsers.filter(
                        (item) => !item || !item.email
                      );
                      if (invalidItems.length > 0) {
                        console.warn("Found invalid invitation data:", invalidItems);
                      }
                    }
                  }}
                  pagination={true}
                  paginationPageSize={10}
                  paginationPageSizeSelector={[10, 25, 50]}
                />
              </div>
            </div>
            <PaginationComponent
              totalPages={pagination.totalPages}
              pageSizeOptions={pagination.pageSizeOptions}
              totalItems={totalItems || 0}
              currentPage={pagination.currentPage}
              pageSize={pagination.pageSize}
              onPageChange={pagination.setCurrentPage}
              onPageSizeChange={pagination.setPageSize}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

