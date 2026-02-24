"use client";
import { useEffect, useRef, useState, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import {
  VRMLoaderPlugin,
  VRM,
  VRMUtils,
  VRMExpressionPresetName,
  VRMHumanBoneName,
} from "@pixiv/three-vrm";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";
import React from "react";
import { BackgroundType, VRMBackground } from "./vrm-background";

interface VRMAvatarProps {
  isSpeaking: boolean;
  audioData?: Float32Array;
  className?: string;
  backgroundType?: BackgroundType;
  backgroundColor1?: string;
  backgroundColor2?: string;
  useThemeColors?: boolean;
  themeStorageKey?: string;
  customImagePath?: string;
  // Add the missing properties
  logoScale?: number;
  logoOpacity?: number;
  logoPosition?: [number, number, number];
  logoRotation?: [number, number, number];
  blendWithBackground?: boolean;
  repetition?: number;
  vrmModelPath?: string;
  onModelPathChange?: (path: string) => void;
}

// Scene lights component that adds lights directly to the scene
const SceneLights = () => {
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[1, 1, 1]} intensity={1.0} />
    </>
  );
};

// VRM Model component that handles the model loading and animation
const VRMModel = ({
  isSpeaking,
  audioData,
  onDebug,
  vrmModelPath
}: {
  isSpeaking: boolean;
  audioData?: Float32Array;
  onDebug: (info: string) => void;
  vrmModelPath?: string;
}) => {
  const { scene } = useThree();
  const vrmRef = useRef<VRM | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const [isLoaded, setIsLoaded] = useState(false);
  const lastMouthOpenValueRef = useRef<number>(0);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [audioVolume, setAudioVolume] = useState(0);

  // Audio processing parameters
  const mouthSmoothing = 0.3; // Mouth movement smoothing factor (lower = smoother)
  const volumeMultiplier = 5.0; // Amplify the mouth movement
  const volumeThreshold = 0.01; // Minimum volume to consider for mouth movement
  const maxMouthOpen = 1.0; // Maximum mouth open value
  const currentModelPathRef = useRef<string>("");
  const modelPath = vrmModelPath || "/models/female-model-avatar.vrm";

  // Debug function
  const addDebugInfo = (info: string) => {
    console.log(info);
    onDebug(info);
  };

  // Load VRM model
  useEffect(() => {
    if (currentModelPathRef.current === modelPath) {
      return;
    }
    const loadVRMModel = async () => {
      try {
        if (vrmRef.current && vrmRef.current.scene) {
          scene.remove(vrmRef.current.scene);
          vrmRef.current = null;
        }
        setIsLoaded(false);
        addDebugInfo(`Loading VRM model from: ${modelPath}`);


        const loader = new GLTFLoader();
        loader.crossOrigin = "anonymous";

        // Register the VRM plugin
        loader.register((parser) => {
          return new VRMLoaderPlugin(parser);
        });

        // Load the model
        loader.load(
          modelPath,
          (gltf) => {
            addDebugInfo("GLTF loaded successfully");

            // Extract VRM from GLTF
            const vrm = gltf.userData.vrm;
            if (!vrm) {
              addDebugInfo("No VRM data found in the loaded model");
              return;
            }

            addDebugInfo("VRM data extracted successfully");

            // Normalize scale for proper display
            VRMUtils.rotateVRM0(vrm);

            // Position the model
            if (vrm.scene) {
              // Get the bounding box of the model
              const bbox = new THREE.Box3().setFromObject(vrm.scene);

              addDebugInfo(
                `Model bounds: Y range: ${bbox.min.y.toFixed(
                  2
                )} to ${bbox.max.y.toFixed(2)}`
              );

              // Move the model so its feet are at the bottom
              const modelHeight = bbox.max.y - bbox.min.y;
              const waistOffset = modelHeight * 0.3; // Crops at waist
              vrm.scene.position.y = -bbox.min.y - waistOffset;
              const scale = 1.2; // Larger since showing less body
              vrm.scene.scale.set(scale, scale, scale);

              addDebugInfo(
                `Model positioned at Y: ${vrm.scene.position.y.toFixed(
                  2
                )}, Scale: ${scale}`
              );
            }

            scene.add(vrm.scene);
            addDebugInfo("VRM scene added to Three.js scene");

            vrmRef.current = vrm;

            // Debug available bones and expressions
            debugModelCapabilities(vrm);

            setIsLoaded(true);
            currentModelPathRef.current = modelPath; // UPDATE: Track current model
            addDebugInfo("VRM model loaded and setup complete");
          },
          (progress) => {
            const percent = ((progress.loaded / progress.total) * 100).toFixed(
              2
            );
            addDebugInfo(`Loading progress: ${percent}%`);
          },
          (error) => {
            addDebugInfo(`Error loading VRM: ${error}`);
          }
        );
      } catch (error) {
        addDebugInfo(`Error in loadVRMModel: ${error}`);
      }
    };

    loadVRMModel();

    // Cleanup function
    return () => {
      if (vrmRef.current && vrmRef.current.scene) {
        scene.remove(vrmRef.current.scene);
      }
    };
  }, [scene, modelPath]);

  // Process audio data to control mouth movements
  useEffect(() => {
    if (!isSpeaking || !audioData || !vrmRef.current) {
      // If not speaking, gradually close the mouth
      if (lastMouthOpenValueRef.current > 0.01) {
        if (vrmRef.current) {
          const newMouthValue = lastMouthOpenValueRef.current * 0.8; // Gradually close
          lastMouthOpenValueRef.current = newMouthValue;

          // Update VRM mouth morphs
          updateMouthShape(newMouthValue);
        }
      }
      return;
    }

    // Process audio data to calculate volume
    let sum = 0;
    let count = 0;

    // Calculate the RMS (root mean square) of the audio samples
    // This gives us a decent volume estimate
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i]; // Square the sample value
      count++;
    }

    if (count > 0) {
      const rms = Math.sqrt(sum / count);
      // Apply volume multiplier and threshold
      let volume = Math.max(0, rms * volumeMultiplier - volumeThreshold);
      // Clamp the volume to a reasonable range
      volume = Math.min(volume, maxMouthOpen);

      // Smooth the mouth movement to reduce jitter
      const smoothedVolume =
        lastMouthOpenValueRef.current * (1 - mouthSmoothing) +
        volume * mouthSmoothing;

      // Store for next frame
      lastMouthOpenValueRef.current = smoothedVolume;

      // Update the mouth shape based on volume
      updateMouthShape(smoothedVolume);

      // Update state for any UI indicators
      setAudioVolume(smoothedVolume);
    }
  }, [isSpeaking, audioData]);

  // Debug model capabilities
  const debugModelCapabilities = (vrm: VRM) => {
    try {
      // Check for humanoid
      if (vrm.humanoid) {
        addDebugInfo("Model has humanoid component");

        // List available bones
        const boneNames = Object.values(VRMHumanBoneName);
        const availableBones = boneNames.filter((boneName) =>
          vrm.humanoid?.getNormalizedBoneNode(boneName as VRMHumanBoneName)
        );

        addDebugInfo(
          `Available bones (${availableBones.length}/${
            boneNames.length
          }): ${availableBones.join(", ")}`
        );
      } else {
        addDebugInfo("Model does NOT have humanoid component");
      }

      // Check for expression manager
      if (vrm.expressionManager) {
        addDebugInfo("Model has expression manager");

        // List available expressions
        const expressionNames = Object.values(VRMExpressionPresetName);
        addDebugInfo(`Available expressions: ${expressionNames.join(", ")}`);
      } else {
        addDebugInfo("Model does NOT have expression manager");
      }
    } catch (error) {
      addDebugInfo(`Error in debugModelCapabilities: ${error}`);
    }
  };

  // Animation frame loop using useFrame
  useFrame((_, delta) => {
    if (!vrmRef.current || !isLoaded) return;

    const time = clockRef.current.getElapsedTime();

    try {
      // Update blinking
      updateBlinking(time);

      // Update breathing and subtle movements
      updateBreathing(time);

      // Arm and hand movements
      updateManualAnimation(time);

      // Lip sync if speaking
      if (isSpeaking && audioData) {
        // First process the audio data to get the mouth open value
        const openValue = processAudioForLipSync(audioData);
        // Then use that value to animate the different mouth shapes over time
        animateMouthShapes(openValue, time); // Pass current time for phoneme cycling
      } else {
        resetMouth();
      }

      // Update VRM
      if (vrmRef.current.update) {
        vrmRef.current.update(delta);
      }
    } catch (error) {
      console.error("Error in animation frame:", error);
    }
  });

  // Handle blinking animation
  const updateBlinking = (time: number) => {
    if (!vrmRef.current || !vrmRef.current.expressionManager) return;

    try {
      // Blink every 3-7 seconds
      const blinkInterval = 5; // seconds
      const blinkDuration = 0.15; // seconds

      const blinkPhase = time % blinkInterval;
      const blinkValue = blinkPhase < blinkDuration ? 1.0 : 0.0;

      vrmRef.current.expressionManager.setValue(
        VRMExpressionPresetName.Blink,
        blinkValue
      );
    } catch (error) {
      console.error("Error in updateBlinking:", error);
    }
  };

  // Handle breathing and subtle movements
  const updateBreathing = (time: number) => {
    if (!vrmRef.current?.humanoid) return;

    try {
      // Subtle chest movement for breathing
      const chest = vrmRef.current.humanoid.getNormalizedBoneNode("chest");
      if (chest) {
        const breathAmount = Math.sin(time * 1.0) * 0.01;
        chest.rotation.z = breathAmount;
      }

      // Subtle head movement
      const neck = vrmRef.current.humanoid.getNormalizedBoneNode("neck");
      if (neck) {
        const neckAmount = Math.sin(time * 0.5) * 0.01;
        neck.rotation.z = neckAmount;
      }

      // Subtle body sway
      const hips = vrmRef.current.humanoid.getNormalizedBoneNode("hips");
      if (hips) {
        const swayAmount = Math.sin(time * 0.3) * 0.01;
        hips.rotation.y = swayAmount;
      }
    } catch (error) {
      console.error("Error in updateBreathing:", error);
    }
  };

  // Manual animation as fallback
  const updateManualAnimation = (time: number) => {
    if (!vrmRef.current?.humanoid) return;

    try {
      // Get all relevant bones
      const leftUpperArm =
        vrmRef.current.humanoid.getNormalizedBoneNode("leftUpperArm");
      const rightUpperArm =
        vrmRef.current.humanoid.getNormalizedBoneNode("rightUpperArm");
      const leftLowerArm =
        vrmRef.current.humanoid.getNormalizedBoneNode("leftLowerArm");
      const rightLowerArm =
        vrmRef.current.humanoid.getNormalizedBoneNode("rightLowerArm");
      const leftHand =
        vrmRef.current.humanoid.getNormalizedBoneNode("leftHand");
      const rightHand =
        vrmRef.current.humanoid.getNormalizedBoneNode("rightHand");

      // Create quaternions for rotations
      const leftArmQuat = new THREE.Quaternion();
      const rightArmQuat = new THREE.Quaternion();
      const leftForearmQuat = new THREE.Quaternion();
      const rightForearmQuat = new THREE.Quaternion();

      // RESET ARMS TO NATURAL POSITION - Fix for "Jesus pose"

      // Calculate animation values based on time
      const armSwing = Math.sin(time * 0.5) * 0.03; // Subtle arm swing
      const forearmBend = Math.sin(time * 0.7) * 0.05; // Subtle forearm bend

      // Left upper arm - hanging down with subtle swing
      if (leftUpperArm) {
        // Create Euler angles for natural arm position
        const leftArmEuler = new THREE.Euler(
          0.1 + Math.sin(time * 0.3) * 0.02, // X - slight forward tilt with subtle movement
          0, // Y - no rotation
          1.3 + armSwing, // Z - arm hanging down with subtle swing
          "XYZ"
        );
        leftArmQuat.setFromEuler(leftArmEuler);
        leftUpperArm.quaternion.copy(leftArmQuat);
      }

      // Right upper arm - hanging down with subtle swing
      if (rightUpperArm) {
        // Create Euler angles for natural arm position
        const rightArmEuler = new THREE.Euler(
          0.1 + Math.sin(time * 0.3 + 0.5) * 0.02, // X - slight forward tilt with subtle movement
          0, // Y - no rotation
          -1.3 - armSwing, // Z - arm hanging down with subtle swing (opposite phase)
          "XYZ"
        );
        rightArmQuat.setFromEuler(rightArmEuler);
        rightUpperArm.quaternion.copy(rightArmQuat);
      }

      // Left lower arm - natural bend at elbow
      if (leftLowerArm) {
        // Create Euler angles for natural forearm position
        const leftForearmEuler = new THREE.Euler(
          0, // X - no rotation
          0, // Y - no rotation
          0.2 + forearmBend, // Z - natural bend at elbow with subtle movement
          "XYZ"
        );
        leftForearmQuat.setFromEuler(leftForearmEuler);
        leftLowerArm.quaternion.copy(leftForearmQuat);
      }

      // Right lower arm - natural bend at elbow
      if (rightLowerArm) {
        // Create Euler angles for natural forearm position
        const rightForearmEuler = new THREE.Euler(
          0, // X - no rotation
          0, // Y - no rotation
          -0.2 - forearmBend, // Z - natural bend at elbow with subtle movement (negative for right arm)
          "XYZ"
        );
        rightForearmQuat.setFromEuler(rightForearmEuler);
        rightLowerArm.quaternion.copy(rightForearmQuat);
      }

      // Hands - relaxed position with subtle movement
      if (leftHand) {
        leftHand.rotation.x = 0.1 + Math.sin(time * 0.6) * 0.05; // Slight downward tilt with movement
        leftHand.rotation.y = Math.sin(time * 0.5) * 0.03; // Subtle side-to-side
        leftHand.rotation.z = Math.sin(time * 0.4) * 0.02; // Subtle twist
      }

      if (rightHand) {
        rightHand.rotation.x = 0.1 + Math.sin(time * 0.6 + 0.5) * 0.05; // Slight downward tilt with movement
        rightHand.rotation.y = Math.sin(time * 0.5 + 0.5) * 0.03; // Subtle side-to-side
        rightHand.rotation.z = Math.sin(time * 0.4 + 0.5) * 0.02; // Subtle twist
      }

      // Add occasional weight shift
      const cycleTime = time % 10; // 10-second cycle
      if (cycleTime > 7 && cycleTime < 9) {
        // Shift weight to one side occasionally
        if (leftUpperArm && leftLowerArm) {
          const shiftPhase = (cycleTime - 7) / 2; // 0 to 1 over 2 seconds
          const shiftAmount = Math.sin(shiftPhase * Math.PI) * 0.1;

          // Adjust left arm for weight shift
          leftUpperArm.rotation.z -= shiftAmount;
          leftLowerArm.rotation.z += shiftAmount * 0.5;
        }

        if (rightUpperArm && rightLowerArm) {
          const shiftPhase = (cycleTime - 7) / 2; // 0 to 1 over 2 seconds
          const shiftAmount = Math.sin(shiftPhase * Math.PI) * 0.1;

          // Adjust right arm for weight shift
          rightUpperArm.rotation.z += shiftAmount;
          rightLowerArm.rotation.z -= shiftAmount * 0.5;
        }
      }
    } catch (error) {
      console.error("Error in updateManualAnimation:", error);
    }
  };

  const processAudioForLipSync = (audioData: Float32Array): number => {
    try {
      // Calculate RMS amplitude
      let sum = 0;
      const sampleSize = Math.min(audioData.length, 1024);

      for (let i = 0; i < sampleSize; i++) {
        sum += audioData[i] * audioData[i];
      }

      const rms = Math.sqrt(sum / sampleSize);

      // Apply non-linear mapping and scaling
      const baseAmplitude = Math.pow(rms * 15, 0.7); // Increase multiplier from 10 to 15 and decrease power for wider opening
      const normalizedAmplitude = Math.min(1.0, baseAmplitude);

      // Add minimum opening when speaking
      const targetValue = isSpeaking
        ? Math.max(0.4, normalizedAmplitude) // Increase minimum from 0.2 to 0.25
        : normalizedAmplitude * 0.8;

      // Apply smoothing for natural movement
      const currentValue = lastMouthOpenValueRef.current || 0;
      const smoothingFactor = targetValue > currentValue ? 0.5 : 0.2;
      const smoothedValue =
        currentValue + (targetValue - currentValue) * smoothingFactor;

      // Update stored value for next frame
      lastMouthOpenValueRef.current = smoothedValue;

      // Update UI state if needed
      setAudioVolume(smoothedValue);

      return smoothedValue;
    } catch (error) {
      console.error("Error processing audio for lip sync:", error);
      return 0;
    }
  };

  // Reset mouth to neutral position
  const resetMouth = () => {
    if (!vrmRef.current || !vrmRef.current.expressionManager) return;

    try {
      vrmRef.current.expressionManager.setValue(VRMExpressionPresetName.Aa, 0);
      vrmRef.current.expressionManager.setValue(VRMExpressionPresetName.Ih, 0);
      vrmRef.current.expressionManager.setValue(VRMExpressionPresetName.Ou, 0);
    } catch (error) {
      console.error("Error in resetMouth:", error);
    }
  };

  // This is the critical function that controls mouth movement
  const updateMouthShape = (openValue: number) => {
    if (!vrmRef.current || !vrmRef.current.expressionManager) return;

    try {
      // Amplify the mouth opening value
      const amplifiedValue = Math.min(1.0, openValue * 1.5); // Increase by 50%

      // Using the expressionManager instead of blendShapeProxy
      vrmRef.current.expressionManager.setValue(
        VRMExpressionPresetName.Aa,
        amplifiedValue
      );

      // Add a slight smile when speaking (optional)
      const smileValue = Math.min(0.3, openValue * 0.5); // Increase smile as well
      vrmRef.current.expressionManager.setValue(
        VRMExpressionPresetName.Ee,
        smileValue
      );
    } catch (error) {
      console.error("Error updating mouth shape:", error);
    }
  };

  // Enhanced function to animate different mouth shapes
  const animateMouthShapes = (openValue: number, timeOffset: number = 0) => {
    if (!vrmRef.current?.expressionManager) return;

    try {
      // Set a more exaggerated base mouth open value
      const amplifiedOpenValue = Math.min(1.0, openValue * 1.3); // Amplify by 30%
      vrmRef.current.expressionManager.setValue(
        VRMExpressionPresetName.Aa,
        amplifiedOpenValue
      );

      // Calculate time-based variations for natural movement
      const time = Date.now() / 1000 + timeOffset;
      const cyclePeriod = 1.2; // Faster cycle for more dynamic movement
      const cyclePos = (time % cyclePeriod) / cyclePeriod; // 0 to 1 position in cycle

      // Lower the threshold for when to use different mouth shapes
      if (openValue > 0.2) {
        // Lower threshold from 0.3 to 0.2
        // Choose which secondary expression to emphasize based on cycle position
        if (cyclePos < 0.2) {
          // 'Ih' (i sound) - exaggerate for wider opening
          vrmRef.current.expressionManager.setValue(
            VRMExpressionPresetName.Ih,
            openValue * 0.9
          ); // Increase from 0.7 to 0.9
          vrmRef.current.expressionManager.setValue(
            VRMExpressionPresetName.Ou,
            0
          );
          vrmRef.current.expressionManager.setValue(
            VRMExpressionPresetName.Ee,
            openValue * 0.3
          ); // Increase from 0.2 to 0.3
        } else if (cyclePos < 0.4) {
          // 'Ee' (e sound) - exaggerate smile width
          vrmRef.current.expressionManager.setValue(
            VRMExpressionPresetName.Ih,
            0
          );
          vrmRef.current.expressionManager.setValue(
            VRMExpressionPresetName.Ou,
            0
          );
          vrmRef.current.expressionManager.setValue(
            VRMExpressionPresetName.Ee,
            openValue * 0.8
          ); // Increase from 0.6 to 0.8
        } else if (cyclePos < 0.6) {
          // 'Ou' (o sound) - more rounded lips
          vrmRef.current.expressionManager.setValue(
            VRMExpressionPresetName.Ih,
            0
          );
          vrmRef.current.expressionManager.setValue(
            VRMExpressionPresetName.Ou,
            openValue * 0.7
          ); // Increase from 0.5 to 0.7
          vrmRef.current.expressionManager.setValue(
            VRMExpressionPresetName.Ee,
            0
          );
        } else {
          // Back to 'Aa' (ah sound) - basic open mouth with max opening
          vrmRef.current.expressionManager.setValue(
            VRMExpressionPresetName.Ih,
            0
          );
          vrmRef.current.expressionManager.setValue(
            VRMExpressionPresetName.Ou,
            0
          );
          vrmRef.current.expressionManager.setValue(
            VRMExpressionPresetName.Ee,
            openValue * 0.2
          ); // Slight increase
        }
      } else {
        // Reset all secondary expressions when mouth is mostly closed
        vrmRef.current.expressionManager.setValue(
          VRMExpressionPresetName.Ih,
          0
        );
        vrmRef.current.expressionManager.setValue(
          VRMExpressionPresetName.Ou,
          0
        );
        // Keep slight smile for natural look
        vrmRef.current.expressionManager.setValue(
          VRMExpressionPresetName.Ee,
          openValue * 0.2
        );
      }
    } catch (error) {
      console.error("Error animating mouth shapes:", error);
    }
  };

  // Return null as we're just managing the model in the scene
  return null;
};

// Error boundary component to catch Three.js errors
class ErrorBoundary extends React.Component<{
  children: React.ReactNode;
  onError: (error: any) => void;
}> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    // Log the error to console
    console.error("Three.js Error:", error);
    console.error("Component Stack:", errorInfo.componentStack);

    // Call the onError prop
    this.props.onError(error);

    // Debug mode - log additional information
    if (process.env.NODE_ENV === "development") {
      console.log("Debug Info:");
      console.log("- Browser:", navigator.userAgent);
      console.log("- WebGL Support:", this.checkWebGLSupport());
      console.log("- Error Type:", error.name);
      console.log("- Error Message:", error.message);
      console.log("- Error Stack:", error.stack);
    }
  }

  // Helper method to check WebGL support
  checkWebGLSupport() {
    try {
      const canvas = document.createElement("canvas");
      return !!(
        window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
      );
    } catch (_e) {// eslint-disable-line @typescript-eslint/no-unused-vars
      return false;
    }
  }

  render() {
    if (this.state.hasError && process.env.NODE_ENV === "development") {
      // Render debug UI in development mode
      return (
        <div className="p-4 bg-red-900/80 text-white rounded-md overflow-auto max-h-full">
          <h2 className="text-xl font-bold mb-2">Three.js Error</h2>
          <p className="mb-2">{this.state.error || "Unknown error"}</p>
          <details className="mt-2">
            <summary className="cursor-pointer text-yellow-300">
              Debug Information
            </summary>
            <pre className="mt-2 p-2 bg-black/50 rounded text-xs overflow-auto max-h-40">
              {this.state.error || "No stack trace available"}
            </pre>
            <div className="mt-2 text-xs">
              <p>Browser: {navigator.userAgent}</p>
              <p>WebGL Support: {this.checkWebGLSupport() ? "Yes" : "No"}</p>
            </div>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

// Main VRMAvatar component
export const VRMAvatar: React.FC<VRMAvatarProps> = ({
  isSpeaking,
  audioData,
  className,
  backgroundType = "gradient",
  backgroundColor1 = "#0f172a",
  backgroundColor2 = "#334155",
  useThemeColors = true,
  themeStorageKey = "theme",
  customImagePath = "/images/mii_company.png",
  vrmModelPath, // ADD: Accept the new prop
  onModelPathChange // ADD: Accept callback prop
}) => {
  const [loadError, setLoadError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");

  // Function to add debug info that can be called from child components
  const addDebugInfo = (info: string) => {
    console.log(info);
    setDebugInfo((prev) => `${prev}\n${info}`);
  };

  console.log("VRMAvatar props:", {
    backgroundType,
    customImagePath,
  });

  useEffect(() => {
    if (onModelPathChange && vrmModelPath) {
      onModelPathChange(vrmModelPath);
    }
  }, [vrmModelPath, onModelPathChange]);

  return (
    <div
      className={`vrm-avatar-container ${className || ""}`}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          maxHeight: "calc(100vh)",
        }}
      >
        <ErrorBoundary
          onError={(error) => {
            console.error("Canvas error:", error);
            setLoadError(`Failed to initialize 3D renderer: ${error}`);
            addDebugInfo(`Error: ${error.message || error}`);
          }}
        >
          <Canvas
            camera={{
              position: [0, 1.2, 2.5], // Closer and higher
              fov: 35 // Wider FOV for better framing
            }}
          >
            <SceneLights />

            {/* Add our VRMBackground with theme props */}
            <VRMBackground
              type={backgroundType}
              color1={backgroundColor1}
              color2={backgroundColor2}
              useThemeColors={useThemeColors}
              storageKey={themeStorageKey}
              customImagePath={customImagePath}
              logoScale={1.35}
              fitToView={true}
              logoPosition={[0, 0.7, -8]}
              // simulateLoading={true} // Enable simulated loading
              // loadingDuration={10000} // Show loading state for 3 seconds
            />

            <Suspense fallback={null}>
              <VRMModel
                isSpeaking={isSpeaking}
                audioData={audioData}
                onDebug={addDebugInfo}
                vrmModelPath={vrmModelPath} 
              />
            </Suspense>

            <OrbitControls
              minDistance={0}     // Closer for half-body
              maxDistance={4}
              enablePan={false}     // No panning
              enableZoom={true}     // Keep zoom only
              enableRotate={false}  // DISABLE ROTATION
              target={[0, 1.3, 0]}  // Focus on upper body
            />
          </Canvas>
        </ErrorBoundary>
      </div>

      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center text-white">
          <div className="bg-black/70 p-6 rounded-lg max-w-md text-center">
            <div className="text-red-400 mb-2 text-4xl">⚠️</div>
            <h3 className="text-white text-xl font-medium mb-2">
              Avatar Error
            </h3>
            <p className="text-gray-300">{loadError}</p>
            <button
              onClick={() => {
                setLoadError(null);
                window.location.reload(); // Simple reload as a fallback
              }}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm"
            >
              Retry Loading
            </button>
          </div>
        </div>
      )}

      {/* Debug panel - only in development */}
      {process.env.NODE_ENV === "development" && debugInfo && (
        <div className="absolute bottom-4 left-4 bg-black/80 text-green-400 text-xs p-2 rounded max-w-xs max-h-40 overflow-auto">
          <pre>{debugInfo}</pre>
        </div>
      )}
    </div>
  );
};
