import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AudioUploaderProps {
  onUploadSuccess: (recordingId: number) => void;
}

const AudioUploader = ({ onUploadSuccess }: AudioUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("audio", file);
      
      const response = await fetch("/api/recordings/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Upload failed");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Upload successful",
        description: "Your audio file has been uploaded and is ready for analysis.",
      });
      onUploadSuccess(data.id);
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message || "An error occurred while uploading the file",
        variant: "destructive",
      });
    }
  });
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndUpload(file);
    }
  };
  
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validateAndUpload(file);
    }
  };
  
  const validateAndUpload = (file: File) => {
    const validTypes = ['audio/mp3', 'audio/wav', 'audio/mpeg', 'audio/m4a', 'audio/x-m4a'];
    const maxSize = 500 * 1024 * 1024; // 500MB
    
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an MP3, WAV, or M4A file",
        variant: "destructive",
      });
      return;
    }
    
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "File size must be less than 500MB",
        variant: "destructive",
      });
      return;
    }
    
    uploadMutation.mutate(file);
  };
  
  return (
    <div className="bg-white rounded-[8px] shadow-[0_1px_2px_rgba(0,0,0,0.05),_0_0_0_1px_rgba(0,0,0,0.05)] p-6">
      <h3 className="text-lg font-semibold font-['SF_Pro_Display'] mb-4">Or upload audio file</h3>
      <div 
        className={`border-2 border-dashed rounded-[8px] p-8 text-center transition-all ${
          isDragging ? "border-secondary bg-secondary bg-opacity-5" : "border-[#E5E5EA]"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center space-y-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#86868B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-[#1D1D1F]">Drag & drop audio files here</p>
          <p className="text-[#86868B] text-sm">MP3, WAV, M4A, up to 500MB</p>
          <label className="mt-3 px-5 py-2 bg-[#007AFF] text-white rounded-full text-sm font-medium cursor-pointer transition duration-200 hover:bg-opacity-90 active:transform active:scale-[0.98]">
            Browse Files
            <input 
              type="file" 
              className="hidden" 
              accept=".mp3,.wav,.m4a,audio/mp3,audio/wav,audio/mpeg,audio/m4a"
              onChange={handleFileInput}
              disabled={uploadMutation.isPending}
            />
          </label>
          
          {uploadMutation.isPending && (
            <div className="mt-2 text-sm text-[#007AFF]">
              Uploading... {Math.round(Math.random() * 100)}%
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AudioUploader;
