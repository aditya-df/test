"use client";

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Link from "next/link";
import { Ellipsis } from "lucide-react";
import { usePathname } from "next/navigation";
import Joyride, { CallBackProps, EVENTS, STATUS, Step } from 'react-joyride';

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Tooltip,
    TooltipTrigger,
    TooltipContent,
    TooltipProvider
} from "@/components/ui/tooltip";
import { useSession } from "next-auth/react";
import { useDashboardStore } from "@/stores/dashboard/useStore";
import { getMenuList } from '@/utils/menu-list';
import { cn } from '@/utils/utils';
import { CollapseMenuButton } from './collapse-menu-button';

interface MenuProps {
    isOpen: boolean | undefined;
}

export type ACLItem = {
    id: string;
    menuType: string | null; // Allow null
    role: string | null;     // Allow null
    create: boolean | null;  // Allow null
    update: boolean | null;  // Allow null
    delete: boolean | null;  // Allow null
    read: boolean | null;    // Allow null
    // Add the missing properties from the error
    createdAt: Date;
    updatedAt: Date;
};

interface Group {
    groupLabel?: string; // Make it optional explicitly
    menus: any[];
}

const createValidSelector = (label: string) => {
    return label.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
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
}


export function Menu({ isOpen }: MenuProps) {
    const { data: session } = useSession();
    const aclList = useMemo(() => 
        (session?.user?.acl ?? []) as ACLItem[], 
        [session?.user?.acl]
    );
    const menuTypes = useMemo(() => 
        aclList.map(item => item.menuType).filter(Boolean) as string[], 
        [aclList]
    );

    const pathname = usePathname();
    const menuList = useMemo(() => getMenuList(pathname, menuTypes), [pathname, menuTypes]);

    const [runTour, setRunTour] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);

    const {
        onboardingGuideCompleted,
        fetchOnboardingGuideStatus,
        updateOnboardingGuideStatus
    } = useDashboardStore();

    const steps: Step[] = useMemo(() => {
        return menuList.flatMap((group: { menus: Array<{ label: string }> }) =>
            group.menus.map((menu: { label: string }) => ({
                target: `.menu-item-${createValidSelector(menu.label)}`,
                content: getMenuItemContent(menu.label),
                disableBeacon: true,
                placement: 'right'
            })));
    }, [menuList]);

    const handleJoyrideCallback = useCallback(async (data: CallBackProps) => {
        const { status, type, index, action } = data;
        console.log('Joyride callback:', { status, type, index, action });

        switch (status) {
            case STATUS.FINISHED:
            case STATUS.SKIPPED:
                setRunTour(false);
                await updateOnboardingGuideStatus(true);
                console.log('Onboarding guide status updated:', onboardingGuideCompleted);
                break;

            default:
                switch (type) {
                    case EVENTS.STEP_AFTER:
                    case EVENTS.TARGET_NOT_FOUND:
                        let nextIndex = index;
                        if (action === 'prev') {
                            nextIndex = index - 1;
                        } else if (action === 'next') {
                            nextIndex = index + 1;
                        }

                        if (nextIndex >= 0 && nextIndex < steps.length) {
                            setStepIndex(nextIndex);
                        } else {
                            setRunTour(false);
                            await updateOnboardingGuideStatus(true);
                            console.log('Onboarding guide status updated:', true);
                        }
                        console.log('Step index:', index);
                        break;
                    case EVENTS.TOUR_START:
                        setStepIndex(index);
                        console.log('Step index:', stepIndex);
                        break;
                    default:
                        break;
                }
        }
    }, [steps.length, updateOnboardingGuideStatus, onboardingGuideCompleted, stepIndex]);

    const startTour = useCallback(() => {
        setStepIndex(0);
        setRunTour(true);
    }, []);

    useEffect(() => {
        fetchOnboardingGuideStatus();
    }, [fetchOnboardingGuideStatus]);

    useEffect(() => {
        if (pathname === '/dashboard' && onboardingGuideCompleted === false) {
            startTour();
        }
    }, [pathname, startTour, onboardingGuideCompleted]);

    return (
        <ScrollArea className="[&>div>div[style]]:!block">
            <nav className="mt-8 h-full w-full">
                <ul className="flex flex-col min-h-[calc(100vh-48px-36px-16px-32px)] lg:min-h-[calc(100vh-32px-40px-32px)] items-start space-y-1">
                    {menuList.map((group: Group, index: number) => {
                        const { groupLabel, menus } = group; // Destructure the properties

                        return (
                            <li className={cn("w-full", groupLabel ? "pt-5" : "")} key={index}>
                                {(isOpen && groupLabel) || isOpen === undefined ? (
                                    <p className="text-sm font-medium text-muted-foreground px-4 pb-2 max-w-[248px] truncate">
                                        {groupLabel}
                                    </p>
                                ) : !isOpen && isOpen !== undefined && groupLabel ? (
                                    <TooltipProvider>
                                        <Tooltip delayDuration={100}>
                                            <TooltipTrigger className="w-full">
                                                <div className="w-full flex justify-center items-center">
                                                    <Ellipsis className="h-5 w-5" />
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="right">
                                                <p>{groupLabel}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                ) : (
                                    <p className="pb-2"></p>
                                )}
                                {menus.map(
                                    ({ href, label, icon: Icon, active, submenus }, menuIndex) => (
                                        <div
                                            className={`w-full menu-item-${createValidSelector(label)}`}
                                            key={menuIndex}
                                        >
                                            {submenus.length === 0 ? (
                                                <TooltipProvider disableHoverableContent>
                                                    <Tooltip delayDuration={100}>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant={active ? "mariner" : "ghost"}
                                                                className={`w-full justify-start h-10 mb-1`}
                                                                asChild
                                                            >
                                                                <Link href={href}>
                                                                    <span className={cn(isOpen === false ? "" : "mr-4")}>
                                                                        <Icon size={18} />
                                                                    </span>
                                                                    <p className={cn(
                                                                        "max-w-[200px] truncate",
                                                                        isOpen === false
                                                                            ? "-translate-x-96 opacity-0"
                                                                            : "translate-x-0 opacity-100"
                                                                    )}>
                                                                        {label}
                                                                    </p>
                                                                </Link>
                                                            </Button>
                                                        </TooltipTrigger>
                                                        {isOpen === false && (
                                                            <TooltipContent side="right">
                                                                {label}
                                                            </TooltipContent>
                                                        )}
                                                    </Tooltip>
                                                </TooltipProvider>
                                            ) : (
                                                <CollapseMenuButton
                                                    icon={Icon}
                                                    label={label}
                                                    active={active}
                                                    submenus={submenus}
                                                    isOpen={isOpen}
                                                />
                                            )}
                                        </div>
                                    )
                                )}
                            </li>
                        );
                    })}
                    {/* Metrodata logo */}
                    <li className="w-full grow flex items-end">
                        <TooltipProvider disableHoverableContent>
                            <Tooltip delayDuration={100}>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start h-10 mt-5 rounded-lg"
                                    >
                                        <p
                                            className={cn(
                                                "whitespace-nowrap",
                                                isOpen === false ? "opacity-0 hidden" : "opacity-100"
                                            )}
                                        >
                                            Product by Metrodata
                                        </p>
                                        <img src='/images/metrodata-logo.png' className={cn(isOpen === false ? "" : "absolute right-4")} alt="Metrodata Logo" width={30} height={30} />
                                    </Button>
                                </TooltipTrigger>
                                {isOpen === false && (
                                    <TooltipContent side="right">Product by Metrodata</TooltipContent>
                                )}
                            </Tooltip>
                        </TooltipProvider>
                    </li>
                </ul>
            </nav>
            {runTour && (
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
                    //   floaterProps={{
                    //     disableAnimation: true,
                    //   }}
                    disableOverlayClose={true}
                    disableCloseOnEsc={true}
                    hideCloseButton={true}
                    spotlightClicks={false}
                    locale={{
                        last: "Finish"
                    }}
                />
            )}
        </ScrollArea>
    );
}