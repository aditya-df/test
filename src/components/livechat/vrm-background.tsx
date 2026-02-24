// Fix for the VRMBackground component
// Path: src/components/livechat/vrm-background.tsx

'use client'
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";

// Background types that can be used
export type BackgroundType =
    | "gradient"
    | "stars"
    | "grid"
    | "cyberpunk"
    | "minimal"
    | "custom-image";

interface VRMBackgroundProps {
    type?: BackgroundType;
    color1?: string;
    color2?: string;
    useThemeColors?: boolean; // Add theme awareness toggle
    storageKey?: string; // For theme detection from localStorage
    customImagePath?: string;

    logoScale?: number; // Control the size of the logo (1.0 = 100%)
    logoOpacity?: number; // Control transparency (0.0-1.0)
    logoPosition?: [number, number, number]; // Custom position [x, y, z]
    logoRotation?: [number, number, number]; // Custom rotation [x, y, z] in radians
    blendWithBackground?: boolean; // Whether to blend with a gradient background
    repetition?: number; // How many times to repeat the logo (for patterns)
    fitToView?: boolean; // Whether to fit the image to the camera view
    simulateLoading?: boolean; // Simulate loading state for testing
    loadingDuration?: number; // Duration in ms to simulate loading
}

function useThemeFromStorage(storageKey = 'theme') {
    const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

    useEffect(() => {
        // Function to check theme from localStorage
        const checkTheme = () => {
            // Check localStorage for theme
            const storedTheme = localStorage.getItem(storageKey);

            // Determine if dark mode is active
            let isDark = false;

            if (storedTheme === 'dark') {
                isDark = true;
            } else if (storedTheme === 'light') {
                isDark = false;
            } else if (storedTheme === 'system' || !storedTheme) {
                // Check system preference if theme is set to system or not set
                isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            }

            setIsDarkMode(isDark);
        };

        // Check theme immediately
        checkTheme();

        // Set up event listener for storage changes
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === storageKey) {
                checkTheme();
            }
        };

        // Listen for storage events (if theme changes in another tab)
        window.addEventListener('storage', handleStorageChange);

        // Listen for system preference changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleMediaChange = () => checkTheme();
        mediaQuery.addEventListener('change', handleMediaChange);

        // Cleanup
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            mediaQuery.removeEventListener('change', handleMediaChange);
        };
    }, [storageKey]);

    return isDarkMode;
}

/**
 * A component to display different types of backgrounds for the VRM avatar scene
 */
export const VRMBackground: React.FC<VRMBackgroundProps> = ({
    type = "gradient",
    color1 = "#0f172a",
    color2 = "#334155",
    useThemeColors = true,
    storageKey = 'theme',
    customImagePath = "/images/mii_company.png",

    logoScale = 1.0,
    logoOpacity = 0.9,
    logoPosition = [0, 0, -8],
    logoRotation = [0, 0, 0],
    blendWithBackground = true,
    repetition = 1,
    fitToView = true,
    simulateLoading = false,
    loadingDuration = 3000, // 3 seconds by default
}) => {
    const { scene, camera, size } = useThree();
    const meshRef = useRef<THREE.Mesh>(null);
    const loadingRef = useRef<THREE.Mesh>(null);
    const isDarkMode = useThemeFromStorage(storageKey);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageTexture, setImageTexture] = useState<THREE.Texture | null>(null);
    const [imageAspect, setImageAspect] = useState(1);
    const [simulatedLoading, setSimulatedLoading] = useState(simulateLoading);

    const themeColor1 = useThemeColors
        ? (isDarkMode ? "#0f172a" : "#e0f2fe") // Dark: slate-900, Light: blue-50
        : color1;

    const themeColor2 = useThemeColors
        ? (isDarkMode ? "#334155" : "#93c5fd") // Dark: slate-700, Light: blue-200
        : color2;

    // Create a gradient texture programmatically
    const gradientTexture = useMemo(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 2;
        canvas.height = 512;
        const context = canvas.getContext("2d");

        if (context) {
            // Create gradient using theme colors (not direct colors)
            const gradient = context.createLinearGradient(0, 0, 0, 512);
            gradient.addColorStop(0, themeColor1); // Use themeColor1 instead of color1
            gradient.addColorStop(1, themeColor2); // Use themeColor2 and make sure it creates a gradient

            // Fill with gradient
            context.fillStyle = gradient;
            context.fillRect(0, 0, 2, 512);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }, [themeColor1, themeColor2]);

    // Create stars particles for the stars background
    const starsGeometry = useMemo(() => {
        if (type !== "stars") return null;

        const geometry = new THREE.BufferGeometry();
        const vertices = [];

        for (let i = 0; i < 2000; i++) {
            const x = (Math.random() - 0.5) * 20;
            const y = (Math.random() - 0.5) * 20;
            const z = (Math.random() - 0.5) * 20 - 5; // Push stars behind character
            vertices.push(x, y, z);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        return geometry;
    }, [type]);

    // Create a grid material for the grid background
    const gridMaterial = useMemo(() => {
        if (type !== "grid") return null;

        // Create grid texture
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext("2d");

        if (context) {
            // Use theme-aware colors for the grid
            const bgColor = isDarkMode ? "#111827" : "#f1f5f9";
            const lineColor = isDarkMode ? "#6366f1" : "#3b82f6";

            context.fillStyle = bgColor;
            context.fillRect(0, 0, 64, 64);
            context.strokeStyle = lineColor;
            context.lineWidth = 1;
            context.strokeRect(0, 0, 64, 64);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(100, 100);

        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0.5
        });

        return material;
    }, [type, isDarkMode]);

    // For cyberpunk and other complex backgrounds, we would use a specific shader
    const cyberpunkMaterial = useMemo(() => {
        if (type !== "cyberpunk") return null;

        // This is a simplified version. In a real application, you'd use a more complex shader
        const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

        // Theme-aware cyberpunk shader
        const fragmentShader = `
      uniform float time;
      uniform bool isDarkMode;
      varying vec2 vUv;
      
      // Simple neon grid effect
      void main() {
        vec2 uv = vUv * 20.0;
        vec2 grid = abs(fract(uv - 0.5) - 0.5) / fwidth(uv);
        float line = min(grid.x, grid.y);
        
        // Pulsing color - different for dark and light modes
        vec3 color = isDarkMode 
          ? vec3(0.1, 0.5, 1.0) * (0.8 + 0.2 * sin(time))  // Blue-purple for dark mode
          : vec3(0.0, 0.6, 0.8) * (0.8 + 0.2 * sin(time)); // Teal-blue for light mode
        
        // Grid lines
        float alpha = 1.0 - min(line, 1.0);
        alpha = smoothstep(0.0, 1.0, alpha);
        
        // Background gradient - different for dark and light modes
        vec3 bgColor = isDarkMode
          ? mix(vec3(0.0, 0.0, 0.1), vec3(0.1, 0.0, 0.2), vUv.y) // Dark blue-purple for dark mode
          : mix(vec3(0.9, 0.95, 1.0), vec3(0.8, 0.9, 1.0), vUv.y); // Light blue for light mode
        
        gl_FragColor = vec4(mix(bgColor, color, alpha), 1.0);
      }
    `;

        return new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0.0 },
                isDarkMode: { value: isDarkMode }
            },
            vertexShader,
            fragmentShader
        });
    }, [type, isDarkMode]);

    // Effect to handle simulated loading
    useEffect(() => {
        if (simulateLoading && type === 'custom-image') {
            // Force the loading state
            setImageLoaded(false);
            setSimulatedLoading(true);
            
            // Set a timeout to "finish" loading after the specified duration
            const timer = setTimeout(() => {
                setImageLoaded(true);
                setSimulatedLoading(false);
            }, loadingDuration);
            
            return () => clearTimeout(timer);
        }
    }, [simulateLoading, loadingDuration, type]);

    // Update the time uniform for shader-based backgrounds
    useEffect(() => {
        if (type === "cyberpunk" && cyberpunkMaterial) {
            const animate = () => {
                (cyberpunkMaterial as THREE.ShaderMaterial).uniforms.time.value = performance.now() * 0.001;
                (cyberpunkMaterial as THREE.ShaderMaterial).uniforms.isDarkMode.value = isDarkMode;
                requestAnimationFrame(animate);
            };

            const animationId = requestAnimationFrame(animate);
            return () => cancelAnimationFrame(animationId);
        }
    }, [type, cyberpunkMaterial, isDarkMode]);

    // Set scene background to solid color for some types
    useEffect(() => {
        if (type === "minimal") {
            // Theme-aware minimal background
            const bgColor = isDarkMode ? "#0f0f1a" : "#f8fafc"; // Dark blue or light gray
            scene.background = new THREE.Color(bgColor);
        } else {
            scene.background = null; // Let our background mesh handle it
        }

        return () => {
            scene.background = null;
        };
    }, [type, scene, isDarkMode]);

    useEffect(() => {
        // Choose the appropriate background color based on the background type
        let backgroundColor;

        switch (type) {
            case "minimal":
                backgroundColor = isDarkMode ? "#0f0f1a" : "#f8fafc"; // Dark blue or light gray
                break;
            case "gradient":
                // For gradient, just use the first color to keep it simple and consistent
                backgroundColor = themeColor1;
                break;
            case "stars":
                // For stars background, use a dark color in dark mode, light in light mode
                backgroundColor = isDarkMode ? "#0f0f1a" : "#f8fafc";
                break;
            case "grid":
                // For grid, use a consistent base color
                backgroundColor = isDarkMode ? "#111827" : "#f1f5f9";
                break;
            case "cyberpunk":
                // For cyberpunk, use a dark color in dark mode, light in light mode
                backgroundColor = isDarkMode ? "#0c0c20" : "#f0f9ff";
                break;
            case "custom-image":
                // For custom-image, use a neutral color as fallback before the image loads
                backgroundColor = isDarkMode ? "#1e1e2d" : "#f8fafc";
                break;
            default:
                backgroundColor = themeColor1;
        }

        // Set the scene background to a solid color
        scene.background = new THREE.Color(backgroundColor);

        // Clean up function
        return () => {
            scene.background = null;
        };
    }, [type, scene, isDarkMode, themeColor1, themeColor2]);

    // Load the custom image texture when needed
    useEffect(() => {
        if (type === 'custom-image' && !imageLoaded && !simulatedLoading) {
            console.log('Loading custom background image from:', customImagePath);
            const loader = new THREE.TextureLoader();
            loader.setCrossOrigin('anonymous');

            // Load the image
            loader.load(
                customImagePath,
                (texture) => {
                    // Add these lines to ensure proper texture display
                    texture.needsUpdate = true;
                    texture.minFilter = THREE.LinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    
                    // Calculate and store aspect ratio
                    const aspectRatio = texture.image.width / texture.image.height;
                    setImageAspect(aspectRatio);
                    
                    // Apply a subtle animation effect when the image loads
                    const material = new THREE.MeshBasicMaterial({
                        map: texture,
                        transparent: true,
                        opacity: 0
                    });
                    
                    // Animate opacity from 0 to logoOpacity
                    const startTime = performance.now();
                    const duration = 800; // ms
                    
                    const animateOpacity = () => {
                        const elapsed = performance.now() - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        material.opacity = progress * logoOpacity;
                        
                        if (progress < 1) {
                            requestAnimationFrame(animateOpacity);
                        }
                    };
                    
                    requestAnimationFrame(animateOpacity);
                    
                    setImageTexture(texture);
                    setImageLoaded(true);
                },
                undefined,
                (error) => {
                    console.error('Error loading custom background image:', error);
                    setImageLoaded(false);
                }
            );
        }
    }, [type, customImagePath, imageLoaded, logoOpacity, simulatedLoading]);

    // Add an animated loading indicator
    useEffect(() => {
        if ((type === 'custom-image' && !imageLoaded) || simulatedLoading) {
            let animationFrame: number;
            const startTime = performance.now();
            
            const animate = () => {
                const elapsed = performance.now() - startTime;
                const rotation = (elapsed % 2000) / 2000 * Math.PI * 2;
                
                if (loadingRef.current) {
                    // Rotate the loading indicator
                    loadingRef.current.rotation.z = -rotation;
                }
                
                animationFrame = requestAnimationFrame(animate);
            };
            
            animationFrame = requestAnimationFrame(animate);
            return () => cancelAnimationFrame(animationFrame);
        }
    }, [type, imageLoaded, simulatedLoading]);

    // Calculate dimensions to fit the camera view
    const calculateViewFittingDimensions = () => {
        if (!camera || !fitToView) return { width: 10, height: 10 };
        
        // Get the camera's field of view and aspect ratio
        const fov = (camera as THREE.PerspectiveCamera).fov;
        const cameraAspect = size.width / size.height;
        
        // Calculate the visible height at the target z position
        const distance = Math.abs(logoPosition[2]);
        const visibleHeight = 2 * Math.tan((fov * Math.PI / 180) / 2) * distance;
        const visibleWidth = visibleHeight * cameraAspect;
        
        // Adjust for image aspect ratio
        let width, height;
        
        if (imageAspect > cameraAspect) {
            // Image is wider than camera view
            width = visibleWidth * 1.1; // Add 10% margin
            height = width / imageAspect;
        } else {
            // Image is taller than camera view
            height = visibleHeight * 1.1; // Add 10% margin
            width = height * imageAspect;
        }
        
        return { width, height };
    };

    // Calculate loading indicator size relative to camera view
    const calculateLoadingSize = () => {
        if (!camera) return 2;
        
        // Get the camera's field of view
        const fov = (camera as THREE.PerspectiveCamera).fov;
        const distance = Math.abs(logoPosition[2]);
        
        // Calculate visible height at this distance
        const visibleHeight = 2 * Math.tan((fov * Math.PI / 180) / 2) * distance;
        // Use a fraction of the visible height for the loading indicator
        return visibleHeight * 0.3; // 30% of visible height
    };

    const planeSize = 100;

    // Render the appropriate background based on type
    if (type === "stars" && starsGeometry) {
        return (
            <>
                {/* Solid background with theme-aware color */}
                <mesh position={[0, 0, -10]}>
                    <planeGeometry args={[planeSize, planeSize]} />
                    <meshBasicMaterial color={isDarkMode ? "#0f0f1a" : "#f8fafc"} />
                </mesh>

                {/* Stars - make them darker in light mode */}
                <points>
                    <primitive object={starsGeometry} attach="geometry" />
                    <pointsMaterial
                        size={0.05}
                        color={isDarkMode ? "#ffffff" : "#1e293b"}
                        sizeAttenuation={true}
                        transparent
                    />
                </points>
            </>
        );
    }

    if (type === "grid" && gridMaterial) {
        return (
            <mesh position={[0, 0, -10]} rotation={[0, 0, 0]}>
                <planeGeometry args={[50, 50]} />
                <primitive object={gridMaterial} attach="material" />
            </mesh>
        );
    }

    if (type === "cyberpunk" && cyberpunkMaterial) {
        return (
            <mesh position={[0, 0, -10]}>
                <planeGeometry args={[planeSize, planeSize]} />
                <primitive object={cyberpunkMaterial} attach="material" />
            </mesh>
        );
    }

    // Custom image background
    if (type === "custom-image") {
        if (imageLoaded && imageTexture && !simulatedLoading) {
            // Calculate dimensions to fit the camera view
            const { width, height } = calculateViewFittingDimensions();
            
            // Apply the scale factor
            const scaledWidth = width * logoScale;
            const scaledHeight = height * logoScale;

            // Create elements array for rendering
            const elements = [];

            // Add gradient background if blending is enabled
            if (blendWithBackground) {
                elements.push(
                    <mesh key="bg" position={[0, 0, -10]}>
                        <planeGeometry args={[100, 100]} />
                        <meshBasicMaterial map={gradientTexture} />
                    </mesh>
                );
            }

            // Calculate positions for repetition if needed
            const positions = [];
            if (repetition <= 1) {
                positions.push(logoPosition);
            } else {
                // Create a pattern based on repetition
                const spread = Math.sqrt(repetition) * 20;
                for (let i = 0; i < repetition; i++) {
                    const row = Math.floor(i / Math.sqrt(repetition));
                    const col = i % Math.sqrt(repetition);
                    const x = (col * spread / Math.sqrt(repetition)) - (spread / 2) + (spread / Math.sqrt(repetition) / 2);
                    const y = (row * spread / Math.sqrt(repetition)) - (spread / 2) + (spread / Math.sqrt(repetition) / 2);
                    positions.push([x, y, logoPosition[2]]);
                }
            }

            // Add logo meshes
            positions.forEach((pos, index) => {
                elements.push(
                    <mesh
                        key={`logo-${index}`}
                        position={pos as [number, number, number]}
                        rotation={logoRotation as [number, number, number]}
                        ref={index === 0 ? meshRef : undefined}
                    >
                        <planeGeometry args={[scaledWidth, scaledHeight]} />
                        <meshBasicMaterial
                            map={imageTexture}
                            transparent={true}
                            opacity={logoOpacity}
                            side={THREE.DoubleSide}
                        />
                    </mesh>
                );
            });

            return <>{elements}</>;
        }
        
        // Fallback while image is loading or if it failed to load
        return (
            <>
                {/* Background color */}
                <mesh position={[0, 0, -10]}>
                    <planeGeometry args={[100, 100]} />
                    <meshBasicMaterial color={isDarkMode ? "#1e1e2d" : "#f8fafc"} />
                </mesh>
                
                {/* Loading indicator - sized relative to camera view */}
                <mesh 
                    position={logoPosition} 
                    ref={loadingRef}
                >
                    <planeGeometry args={[calculateLoadingSize(), calculateLoadingSize()]} />
                    <meshBasicMaterial transparent={true}>
                                                <primitive attach="map" object={createLoadingTexture(isDarkMode)} />
                    </meshBasicMaterial>
                </mesh>
            </>
        );
    }

    // Default: gradient background
    return (
        <mesh position={[0, 0, -10]}>
            <planeGeometry args={[planeSize, planeSize]} />
            <meshBasicMaterial map={gradientTexture} />
        </mesh>
    );
};

// Helper function to create a loading indicator texture
function createLoadingTexture(isDarkMode: boolean): THREE.Texture {
    // Create a smaller canvas for better performance
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
        // Background
        ctx.fillStyle = isDarkMode ? '#1e1e2d' : '#f8fafc';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add a subtle gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, isDarkMode ? '#1e1e2d' : '#f8fafc');
        gradient.addColorStop(1, isDarkMode ? '#0f172a' : '#e2e8f0');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Loading text - smaller and more elegant
        ctx.font = 'bold 20px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isDarkMode ? '#ffffff' : '#334155';
        ctx.fillText('Loading background...', canvas.width / 2, canvas.height / 2 - 15);
        
        // Loading spinner (more modern looking)
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2 + 25;
        const outerRadius = 15;
        const innerRadius = 12;
        
        // Outer circle (track)
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
        ctx.strokeStyle = isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Inner circle (progress) - this will be animated by rotating the mesh
        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 0.75);
        ctx.strokeStyle = isDarkMode ? '#4f46e5' : '#3b82f6';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();
        
        // Add a subtle instruction text
        ctx.font = '12px Arial, sans-serif';
        ctx.fillStyle = isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';
        ctx.fillText('Please wait...', canvas.width / 2, centerY + 35);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    // Set proper filtering for better scaling
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    
    return texture;
}

