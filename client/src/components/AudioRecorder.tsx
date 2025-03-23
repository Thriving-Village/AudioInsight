import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import AudioVisualizer from "./AudioVisualizer";
import { formatTime } from "@/utils/formatTime";

interface AudioRecorderProps {
  onRecordingComplete: (recordingId: number) => void;
}

const AudioRecorder = ({ onRecordingComplete }: AudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingTitle, setRecordingTitle] = useState("New Recording");
  
  const { toast } = useToast();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  
  const saveMutation = useMutation({
    mutationFn: async (audioBlob: Blob) => {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      formData.append("title", recordingTitle);
      formData.append("duration", recordingTime.toString());
      
      const response = await fetch("/api/recordings", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to save recording");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Recording saved",
        description: "Your recording has been saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/recordings'] });
      onRecordingComplete(data.id);
    },
    onError: (error) => {
      toast({
        title: "Error saving recording",
        description: error.message || "An error occurred while saving your recording",
        variant: "destructive",
      });
    }
  });
  
  // Clean up resources on component unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstart = () => {
        setIsRecording(true);
        startTimer();
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Only save if we have recorded some audio
        if (audioChunksRef.current.length > 0) {
          saveMutation.mutate(audioBlob);
        }
        
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        setIsRecording(false);
        setIsPaused(false);
        stopTimer();
      };
      
      mediaRecorder.start(1000); // Collect data in 1-second chunks
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Recording Error",
        description: "Could not access microphone. Please check permissions and try again.",
        variant: "destructive",
      });
    }
  };
  
  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      pauseTimer();
    }
  };
  
  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      resumeTimer();
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };
  
  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Just stop the media recorder
      mediaRecorderRef.current.stop();
      // Clear the chunks to avoid saving
      audioChunksRef.current = [];
      
      toast({
        title: "Recording canceled",
        description: "Recording has been discarded",
      });
    }
  };
  
  const startTimer = () => {
    setRecordingTime(0);
    timerIntervalRef.current = window.setInterval(() => {
      setRecordingTime(prevTime => prevTime + 1);
    }, 1000);
  };
  
  const pauseTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };
  
  const resumeTimer = () => {
    if (!timerIntervalRef.current) {
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingTime(prevTime => prevTime + 1);
      }, 1000);
    }
  };
  
  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setRecordingTime(0);
  };
  
  // Generate a default title based on date/time
  useEffect(() => {
    const now = new Date();
    setRecordingTitle(`Recording ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
  }, []);
  
  return (
    <div className="bg-white rounded-[8px] shadow-[0_1px_2px_rgba(0,0,0,0.05),_0_0_0_1px_rgba(0,0,0,0.05)] p-6 text-center space-y-6">
      <h2 className="text-xl font-semibold font-['SF_Pro_Display']">Record a Conversation</h2>
      
      {/* Audio Visualization */}
      <div className="py-6 flex justify-center">
        <AudioVisualizer isRecording={isRecording && !isPaused} />
      </div>
      
      {/* Timer */}
      <div className="font-['SF_Mono'] text-xl">{formatTime(recordingTime)}</div>
      
      {/* Recording Controls */}
      <div className="flex justify-center items-center space-x-8">
        {isRecording ? (
          <>
            <button 
              onClick={cancelRecording}
              className="rounded-full p-2 bg-[#E5E5EA] hover:bg-opacity-80 transition duration-200 active:transform active:scale-[0.98]"
              aria-label="Cancel recording"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {isPaused ? (
              <button 
                onClick={resumeRecording}
                className="rounded-full h-16 w-16 flex items-center justify-center bg-[#000000] hover:bg-opacity-90 text-white transition duration-200 active:transform active:scale-[0.98]"
                aria-label="Resume recording"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            ) : (
              <button 
                onClick={pauseRecording}
                className="rounded-full h-16 w-16 flex items-center justify-center bg-[#000000] hover:bg-opacity-90 text-white transition duration-200 active:transform active:scale-[0.98]"
                aria-label="Pause recording"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}
            
            <button 
              onClick={stopRecording}
              className="rounded-full p-2 bg-[#E5E5EA] hover:bg-opacity-80 transition duration-200 active:transform active:scale-[0.98]"
              aria-label="Stop recording"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </>
        ) : (
          <button 
            onClick={startRecording}
            className="rounded-full h-16 w-16 flex items-center justify-center bg-[#000000] hover:bg-opacity-90 text-white transition duration-200 active:transform active:scale-[0.98]"
            aria-label="Start recording"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
        )}
      </div>
      
      {saveMutation.isPending && (
        <div className="text-sm text-[#007AFF]">
          Saving recording...
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;
