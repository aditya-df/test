import { Label } from "@/components/ui/label";
import React from "react";
import { Bot, Sparkles, Brain, CheckCircle } from "lucide-react";

export const AVATAR_OPTIONS = [
  {
    id: "bot-classic",
    name: "Classic Bot",
    icon: Bot,
    gradient: "from-blue-500 to-purple-600",
    description: "Professional and trustworthy",
  },
  {
    id: "brain-smart",
    name: "Smart Brain",
    icon: Brain,
    gradient: "from-green-500 to-teal-600",
    description: "Intelligent and analytical",
  },
  {
    id: "ai-modern",
    name: "AI Assistant",
    icon: Sparkles,
    gradient: "from-purple-500 to-pink-600",
    description: "Creative and innovative",
  },
];

export const GetAvatarInfo = (imageId?: string) => {
  return (
    AVATAR_OPTIONS.find((avatar) => avatar.id === imageId) || AVATAR_OPTIONS[0]
  );
};

export const AvatarPreview = ({
  avatarId,
  size = "md",
}: {
  avatarId?: string;
  size?: "sm" | "md" | "lg";
}) => {
  const avatar =
    AVATAR_OPTIONS.find((a) => a.id === avatarId) || AVATAR_OPTIONS[0];
  const Icon = avatar.icon;

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${avatar.gradient} flex items-center justify-center shadow-lg`}
    >
      <Icon className={`${iconSizes[size]} text-white`} />
    </div>
  );
};

export const AvatarSelection = ({
  selectedAvatar,
  onSelect,
}: {
  selectedAvatar?: string;
  onSelect: (avatarId: string) => void;
}) => {
  return (
    <div>
      <Label className="text-sm font-medium block mb-3">Choose Avatar</Label>
      <div className="grid md:grid-cols-3 gap-3">
        {AVATAR_OPTIONS.map((avatar) => {
          const Icon = avatar.icon;
          const isSelected = selectedAvatar === avatar.id;

          return (
            <div
              key={avatar.id}
              className={`flex md:flex-col gap-x-4 gap-y-2 items-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border hover:border-border/80"
              }`}
              onClick={() => onSelect(avatar.id)}
            >
              <div
                className={`w-12 h-12 rounded-full bg-gradient-to-br ${avatar.gradient} flex items-center justify-center shadow-sm`}
              >
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div className="md:text-center grid gap-y-1">
                <p className="text-xs font-medium">
                  {avatar.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {avatar.description}
                </p>
                {isSelected && (
                  <CheckCircle className="h-4 w-4 text-primary md:mx-auto" />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Select an avatar that represents your agents personality
      </p>
    </div>
  );
};
