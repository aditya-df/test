import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const DatasourceSkeleton = () => {
    return (
        <div className="container py-4">
            {/* Breadcrumb skeleton */}
            {/* <div className="flex items-center gap-2 mb-6">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-5 w-16" />
            </div> */}

            <Card className="w-full mt-[12px]">
                <CardHeader>
                    <Skeleton className="h-8 w-56 mb-2" /> {/* Title */}
                    <Skeleton className="h-5 w-72" /> {/* Description */}
                </CardHeader>
                <CardContent>
                    {/* Button area */}
                    <div className="flex justify-end mb-6">
                        <Skeleton className="h-10 w-28" /> {/* Add Agent button */}
                    </div>

                    {/* Table area with fixed height to match your actual table */}
                    <div className="h-[500px] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                        {/* Table header */}
                        <div className="bg-gray-50 dark:bg-gray-800 py-3 px-4 border-b">
                            <div className="grid grid-cols-12 gap-4">
                                <Skeleton className="h-6 w-full col-span-4" /> {/* Agent Name */}
                                <Skeleton className="h-6 w-full col-span-6" /> {/* Description */}
                                <Skeleton className="h-6 w-full col-span-2" /> {/* Actions */}
                            </div>
                        </div>

                        {/* Table rows */}
                        <div className="bg-white dark:bg-gray-950">
                            {Array(7).fill(0).map((_, i) => (
                                <div key={i} className="grid grid-cols-12 gap-4 py-4 px-4 border-b">
                                    <Skeleton className="h-5 w-full col-span-4" />
                                    <Skeleton className="h-5 w-full col-span-6" />
                                    <div className="col-span-2 flex justify-center gap-2">
                                        <Skeleton className="h-8 w-8 rounded-full" />
                                        <Skeleton className="h-8 w-8 rounded-full" />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination skeleton */}
                        <div className="bg-white dark:bg-gray-950 py-3 px-4 border-t flex justify-between items-center">
                            <Skeleton className="h-8 w-36" /> {/* Page Size */}
                            <div className="flex gap-2 items-center">
                                <Skeleton className="h-8 w-96" /> {/* Pagination */}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}