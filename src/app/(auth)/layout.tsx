/* eslint-disable react-hooks/purity */
"use client";

import * as React from "react";
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

import { siteConfig } from "@/config/site";
import { cn } from "@/utils/utils";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({
  children,
}: AuthLayoutProps): React.ReactElement {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [isClient, setIsClient] = useState(false);
  const backgroundRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Set client-side flag
    setIsClient(true);

    // Set initial window size
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });

    // Update window size on resize
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Track mouse position
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX,
        y: e.clientY,
      });
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // Calculate gradient position based on mouse
  const gradientX = (mousePosition.x + 250) / windowSize.width;
  const gradientY = mousePosition.y / windowSize.height;

  // Generate particles with responsive count - FIXED: Only generate on client
  const particleCount =
    windowSize.width < 768 ? 8 : windowSize.width < 1024 ? 12 : 20;

  // Use useMemo to generate stable particle data
  const particles = React.useMemo(() => {
    if (!isClient) return []; // Return empty array during SSR

    return Array.from({ length: particleCount }).map((_, i) => ({
      id: i,
      size: Math.random() * 4 + 1,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 20 + 10,
      delay: Math.random() * 5,
    }));
  }, [particleCount, isClient]);

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden">
      {/* Glass effect for content */}
      <div className="relative z-10 min-h-screen w-full flex flex-col lg:flex-row items-center justify-center">
        {/* Background Section - Hidden on mobile, visible on desktop */}
        <div
          className={cn(
            "hidden lg:block lg:flex-1 w-full h-screen dark:bg-gray-900 p-4",
            process.env.NEXT_PUBLIC_BAZNAS_THEME == "true"
              ? "bg-[#ecfff6] dark:bg-gray-900"
              : "bg-white dark:bg-gray-900"
          )}
        >
          {/* Animated background */}
          <div className="relative w-full h-full rounded-2xl overflow-hidden">
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
              <div className="flex gap-x-2 items-center justify-center">
                <div>
                  <Image
                    src="/km/favicon/android-chrome-192x192.png"
                    width={240}
                    height={240}
                    alt={siteConfig.name}
                    className="size-36"
                  />
                  <span className="text-2xl bg-gradient-to-r from-pink-600 to-purple-400 bg-clip-text font-extrabold text-transparent">
                    {siteConfig.name}
                  </span>
                </div>
                {process.env.NEXT_PUBLIC_BAZNAS_THEME == "true" && (
                  <>
                    <p className="text-gray-400 mx-5">x</p>
                    <Image
                      src="/images/logo_baznas.png"
                      alt="Baznas Logo"
                      width={228}
                      height={240}
                    />
                  </>
                )}
                {process.env.NEXT_PUBLIC_BP_THEME == "true" && (
                  <>
                    <p className="text-gray-400 mx-5">x</p>
                    <Image
                      src="/images/logo_bp_tiwi.png"
                      alt="BP Logo"
                      width={220}
                      height={220}
                    />
                  </>
                )}
              </div>
            </div>
            <div
              ref={backgroundRef}
              className="absolute inset-0 z-0 overflow-hidden"
              style={{
                background: `radial-gradient(circle at ${gradientX * 100}% ${
                  gradientY * 100
                }%, rgba(59, 130, 246, 0.3), rgba(16, 185, 129, 0.1), rgba(0, 0, 0, 0.05))`,
              }}
            >
              {/* Animated particles - Only render on client */}
              {isClient &&
                particles.map((particle) => (
                  <motion.div
                    key={particle.id}
                    className="absolute rounded-full bg-white opacity-70 dark:opacity-30"
                    style={{
                      width: particle.size,
                      height: particle.size,
                      left: `${particle.x}%`,
                      top: `${particle.y}%`,
                    }}
                    animate={{
                      y: ["0%", "100%", "0%"],
                      x: [
                        `${particle.x}%`,
                        `${particle.x + (Math.random() * 10 - 5)}%`,
                        `${particle.x}%`,
                      ],
                      opacity: [0.2, 0.8, 0.2],
                    }}
                    transition={{
                      duration: particle.duration,
                      repeat: Infinity,
                      delay: particle.delay,
                      ease: "easeInOut",
                    }}
                  />
                ))}

              {/* Gradient blobs */}
              <motion.div
                className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-blue-500 opacity-20 blur-3xl filter"
                animate={{
                  x: [0, 100, 0],
                  y: [0, 50, 0],
                }}
                transition={{
                  duration: 15,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <motion.div
                className="absolute -right-20 bottom-32 h-72 w-72 rounded-full bg-purple-500 opacity-20 blur-3xl filter"
                animate={{
                  x: [0, -100, 0],
                  y: [0, -50, 0],
                }}
                transition={{
                  duration: 18,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <motion.div
                className="absolute bottom-20 left-1/3 h-64 w-64 rounded-full bg-green-500 opacity-20 blur-3xl filter"
                animate={{
                  x: [0, 50, 0],
                  y: [0, -30, 0],
                }}
                transition={{
                  duration: 12,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              {/* Grid pattern overlay */}
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), 
                              linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                  backgroundSize: "40px 40px",
                }}
              />
            </div>
          </div>
        </div>

        {/* Form Section - Responsive design */}
        <div
          className={cn(
            "relative w-full lg:w-auto lg:max-w-md xl:max-w-lg min-h-screen lg:h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 md:px-8 md:py-12",
            process.env.NEXT_PUBLIC_BAZNAS_THEME == "true"
              ? "bg-[#ecfff6] dark:bg-gray-900"
              : "bg-white dark:bg-gray-900"
          )}
        >
          {/* Mobile Logo - Only visible on small screens */}
          <div className="lg:hidden mb-8 flex flex-col items-center">
            <div className="flex gap-x-2 items-center justify-center">
              <div>
                <Image
                  src="/km/favicon/android-chrome-192x192.png"
                  width={80}
                  height={80}
                  alt={siteConfig.name}
                  className="size-20"
                />
                <span className="text-2xl bg-gradient-to-r from-pink-600 to-purple-400 bg-clip-text font-extrabold text-transparent">
                  {siteConfig.name}
                </span>
              </div>
              {process.env.NEXT_PUBLIC_BAZNAS_THEME == "true" && (
                <>
                  <p className="text-gray-400 mx-5">x</p>
                  <Image
                    src="/images/logo_baznas.png"
                    alt="KnowgenAI Logo"
                    width={124}
                    height={120}
                  />
                </>
              )}
              {process.env.NEXT_PUBLIC_BP_THEME == "true" && (
                <>
                  <p className="text-gray-400 mx-5">x</p>
                  <Image
                    src="/images/logo_bp_tiwi.png"
                    alt="BP Logo"
                    width={124}
                    height={120}
                  />
                </>
              )}
            </div>
          </div>

          {/* Mobile Background Effect - Only visible on small screens */}
          <div className="lg:hidden absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <div
              style={{
                background: `radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.1), rgba(16, 185, 129, 0.05), rgba(0, 0, 0, 0.02))`,
              }}
              className="absolute inset-0"
            >
              {/* Simplified particles for mobile - Only render on client */}
              {isClient &&
                particles.slice(0, 6).map((particle) => (
                  <motion.div
                    key={particle.id}
                    className="absolute rounded-full bg-gray-400 opacity-20 dark:opacity-10"
                    style={{
                      width: particle.size * 0.7,
                      height: particle.size * 0.7,
                      left: `${particle.x}%`,
                      top: `${particle.y}%`,
                    }}
                    animate={{
                      y: ["0%", "100%", "0%"],
                      opacity: [0.1, 0.3, 0.1],
                    }}
                    transition={{
                      duration: particle.duration * 1.5,
                      repeat: Infinity,
                      delay: particle.delay,
                      ease: "easeInOut",
                    }}
                  />
                ))}
            </div>
          </div>

          {/* Form Content */}
          <div className="relative z-10 w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-md flex flex-col items-center justify-center">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
