import React, { useState, KeyboardEvent, ChangeEvent, FC } from "react";

// Define the Tag interface
interface Tag {
  id: string;
  text: string;
}

interface TagInputProps {
  tags: Tag[];
  setTags: React.Dispatch<React.SetStateAction<Tag[]>>;
  placeholder?: string;
  maxTags?: number; // ✅ NEW: Add maxTags prop
}

const TagInput: FC<TagInputProps> = ({
  tags,
  setTags,
  placeholder,
  maxTags = 10 // ✅ NEW: Default to 10 tags (Gmail limit)
}) => {
  const [input, setInput] = useState<string>("");
  const [error, setError] = useState<string>(""); // ✅ NEW: Error state

  // Handler for input change
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (error) setError(""); // ✅ NEW: Clear error when typing
  };

  // Handler for key presses
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      const trimmedInput = input.trim();

      // ✅ NEW: Check if max tags limit is reached
      if (tags.length >= maxTags) {
        setError(`Maximum ${maxTags} email addresses allowed`);
        setInput("");
        return;
      }

      if (trimmedInput && validateEmail(trimmedInput)) {
        const newTag: Tag = {
          id: `${trimmedInput}-${Date.now()}`,
          text: trimmedInput,
        };

        if (!tags.some(tag => tag.text.toLowerCase() === trimmedInput.toLowerCase())) {
          setTags([...tags, newTag]);
          setInput("");
          setError(""); // ✅ NEW: Clear error on success
        } else {
          setError("This email address has already been added"); // ✅ NEW: Better error message
          setInput("");
        }
      } else if (trimmedInput) {
        setError("Please enter a valid email address"); // ✅ NEW: Better error message
        setInput("");
      }
    }
  };

  // Handler to remove a tag
  const handleRemoveTag = (id: string) => {
    setTags(tags.filter(tag => tag.id !== id));
    setError(""); // ✅ NEW: Clear error when removing
  };

  // Simple email validation
  const validateEmail = (email: string): boolean => {
    const re =
      /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@(([^<>()[\]\.,;:\s@"]+\.)+[^<>()[\]\.,;:\s@"]{2,})$/i;
    return re.test(email.toLowerCase());
  };

  const isMaxReached = tags.length >= maxTags; // ✅ NEW: Check if limit reached

  return (
    <div className="tag-input-container space-y-2">
      {/* Tags Display */}
      <div className="border p-2 rounded min-h-[60px] max-h-[200px] overflow-y-auto">
        <div className="tags flex flex-wrap gap-2">
          {tags.map(tag => (
            <div
              key={tag.id}
              className="tag bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded flex items-center text-sm"
            >
              <span className="truncate max-w-[200px]">{tag.text}</span>
              <button
                type="button"
                onClick={() => handleRemoveTag(tag.id)}
                className="ml-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 focus:outline-none transition-colors"
                aria-label={`Remove ${tag.text}`}
              >
                &times;
              </button>
            </div>
          ))}
          {/* ✅ NEW: Empty state message */}
          {tags.length === 0 && (
            <span className="text-gray-400 text-sm italic">
              No email addresses added yet
            </span>
          )}
        </div>
      </div>

      {/* Input Field */}
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={
            isMaxReached
              ? "Maximum limit reached"
              : placeholder || "Add email address & press enter or space..."
          }
          disabled={isMaxReached} // ✅ NEW: Disable when max reached
          className={`w-full p-2 border rounded focus:outline-none focus:ring-2 transition-all ${isMaxReached
              ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed text-gray-500'
              : 'focus:ring-blue-500'
            } ${error ? 'border-red-500 focus:ring-red-500' : ''}`}
        />
      </div>

      {/* ✅ NEW: Counter and Error Messages */}
      <div className="flex items-center justify-between text-sm">
        <div className={`flex items-center gap-1 ${isMaxReached ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-600 dark:text-gray-400'
          }`}>
          <span>{tags.length} / {maxTags} email addresses</span>
        </div>

        {error && (
          <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* ✅ NEW: Help Text */}
      {!isMaxReached && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Press Enter, Space, or Comma to add multiple email addresses
        </p>
      )}
    </div>
  );
};

export default TagInput;
