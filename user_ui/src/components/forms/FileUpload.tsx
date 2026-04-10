import React, { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";

interface FileUploadProps {
  label: string;
  description?: string;
  error?: string;
  onChange: (file: File | null) => void;
  accept?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label,
  description,
  error,
  onChange,
  accept = "image/*",
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      onChange(file);
    } else {
      setPreview(null);
      onChange(null);
    }
  };

  const removeFile = () => {
    setPreview(null);
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full">
      <label className="block text-xs uppercase font-bold text-zinc-500 dark:text-zinc-400 mb-1.5">
        {label}
      </label>
      {description && (
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-3 leading-relaxed">
          {description}
        </p>
      )}
      
      <div 
        className={`
          relative group cursor-pointer
          border-2 border-dashed rounded-xl overflow-hidden
          transition-all duration-200 aspect-video flex flex-col items-center justify-center
          ${error ? "border-red-500 bg-red-50/10" : "border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"}
          ${preview ? "border-none" : "p-6"}
        `}
        onClick={() => !preview && fileInputRef.current?.click()}
      >
        {preview ? (
          <>
            <img 
              src={preview} 
              alt="Preview" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile();
                }}
                className="p-2 bg-white dark:bg-zinc-900 rounded-full text-red-500 shadow-lg hover:scale-110 transition-transform"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </>
        ) : (
          <div className="text-center">
            <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors">
              <Upload className="w-6 h-6 text-zinc-400 group-hover:text-indigo-500" />
            </div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Click to upload photo
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              PNG, JPG up to 10MB
            </p>
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {error && (
        <p className="mt-1.5 text-xs text-red-500 font-medium">{error}</p>
      )}
    </div>
  );
};
