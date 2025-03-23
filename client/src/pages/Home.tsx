import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AudioRecorder from "@/components/AudioRecorder";
import AudioUploader from "@/components/AudioUploader";
import RecordingsList from "@/components/RecordingsList";
import SummaryView from "@/components/SummaryView";
import ChatInterface from "@/components/ChatInterface";
import TranscriptViewer from "@/components/TranscriptViewer";
import AudioVisualizer from "@/components/AudioVisualizer";
import { Recording } from "@shared/types";
import { formatTime } from "@/utils/formatTime";

type Tab = "record" | "analyze" | "review";

const Home = () => {
  const [activeTab, setActiveTab] = useState<Tab>("record");
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [processingRecordingId, setProcessingRecordingId] = useState<number | null>(null);
  
  const { data: processingStatus, isLoading } = useQuery<{progress: number, status: string}>({
    queryKey: [`/api/recordings/${processingRecordingId}/status`],
    enabled: !!processingRecordingId && activeTab === "analyze",
    refetchInterval: processingRecordingId ? 1000 : false,
  });
  
  const handleRecordingComplete = (recordingId: number) => {
    setProcessingRecordingId(recordingId);
    setActiveTab("analyze");
  };
  
  const handleUploadSuccess = (recordingId: number) => {
    setProcessingRecordingId(recordingId);
    setActiveTab("analyze");
  };
  
  const handleSelectRecording = (recording: Recording) => {
    setSelectedRecording(recording);
    setActiveTab("review");
  };
  
  const isAnalysisComplete = processingStatus?.progress === 100;
  
  // If analysis is complete, move to review tab and set the processed recording
  if (processingRecordingId && isAnalysisComplete && activeTab === "analyze") {
    // Get the recording data from the API
    fetch(`/api/recordings/${processingRecordingId}`)
      .then(res => res.json())
      .then(recording => {
        setSelectedRecording(recording);
        setActiveTab("review");
        setProcessingRecordingId(null);
      })
      .catch(err => console.error("Error fetching recording details:", err));
  }
  
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="py-4 px-6 border-b border-[#E5E5EA] flex justify-between items-center bg-[#FFFFFF] sticky top-0 z-10">
        <h1 className="text-2xl font-semibold font-['SF_Pro_Display'] text-[#000000]">ConvoAnalytics</h1>
        <button 
          className="text-[#007AFF] hover:text-opacity-80 transition duration-200 active:transform active:scale-[0.98]"
          onClick={() => {
            setActiveTab("record");
            setSelectedRecording(null);
            setProcessingRecordingId(null);
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
      </header>
      
      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 pb-24">
        <div className="my-8">
          {/* Tab Navigation */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex bg-[#F2F2F7] rounded-[8px] p-[2px]">
              <button 
                className={`rounded-[6px] px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  activeTab === "record" 
                    ? "bg-white text-[#1D1D1F] shadow-[0_2px_4px_rgba(0,0,0,0.1)]" 
                    : "text-[#86868B]"
                }`}
                onClick={() => setActiveTab("record")}
              >
                Record
              </button>
              <button 
                className={`rounded-[6px] px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  activeTab === "analyze" 
                    ? "bg-white text-[#1D1D1F] shadow-[0_2px_4px_rgba(0,0,0,0.1)]" 
                    : "text-[#86868B]"
                }`}
                onClick={() => {
                  if (processingRecordingId) {
                    setActiveTab("analyze");
                  }
                }}
                disabled={!processingRecordingId}
              >
                Analyze
              </button>
              <button 
                className={`rounded-[6px] px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  activeTab === "review" 
                    ? "bg-white text-[#1D1D1F] shadow-[0_2px_4px_rgba(0,0,0,0.1)]" 
                    : "text-[#86868B]"
                }`}
                onClick={() => {
                  if (selectedRecording) {
                    setActiveTab("review");
                  }
                }}
                disabled={!selectedRecording}
              >
                Review
              </button>
            </div>
          </div>
          
          {/* Tab Content */}
          <div className="transition-all duration-300">
            {/* Record Tab */}
            {activeTab === "record" && (
              <div className="space-y-8 transition-all duration-300">
                <AudioRecorder onRecordingComplete={handleRecordingComplete} />
                <AudioUploader onUploadSuccess={handleUploadSuccess} />
                <RecordingsList onSelectRecording={handleSelectRecording} />
              </div>
            )}
            
            {/* Analyze Tab */}
            {activeTab === "analyze" && (
              <div className="space-y-8 transition-all duration-300">
                <div className="bg-white rounded-[8px] shadow-[0_1px_2px_rgba(0,0,0,0.05),_0_0_0_1px_rgba(0,0,0,0.05)] p-6 text-center">
                  <h2 className="text-xl font-semibold font-['SF_Pro_Display'] mb-6">Analyzing Conversation</h2>
                  
                  {/* Audio Info */}
                  <div className="mb-8">
                    <h3 className="font-medium text-lg">Processing Audio</h3>
                    <p className="text-[#86868B]">Please wait while we analyze your recording</p>
                  </div>
                  
                  {/* Progress */}
                  <div className="mb-8 space-y-4">
                    <div className="w-full bg-[#E5E5EA] rounded-full h-2">
                      <div 
                        className="bg-[#007AFF] h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${processingStatus?.progress || 0}%` }}
                      ></div>
                    </div>
                    <p className="text-[#86868B]">
                      {processingStatus?.status || "Preparing audio..."} {processingStatus?.progress || 0}%
                    </p>
                  </div>
                  
                  {/* Status Animation */}
                  <div className="flex justify-center mb-6">
                    <AudioVisualizer isRecording={true} />
                  </div>
                  
                  {/* Cancel Button */}
                  <button 
                    className="px-6 py-2 border border-[#E5E5EA] text-[#1D1D1F] rounded-full text-sm font-medium transition duration-200 hover:bg-[#F5F5F7] active:transform active:scale-[0.98]"
                    onClick={() => {
                      setActiveTab("record");
                      setProcessingRecordingId(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            {/* Review Tab */}
            {activeTab === "review" && selectedRecording && (
              <div className="space-y-8 transition-all duration-300">
                {/* Recording Info */}
                <div className="bg-white rounded-[8px] shadow-[0_1px_2px_rgba(0,0,0,0.05),_0_0_0_1px_rgba(0,0,0,0.05)] p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-semibold font-['SF_Pro_Display']">{selectedRecording.title}</h2>
                      <p className="text-[#86868B]">
                        {new Date(selectedRecording.createdAt).toLocaleDateString()} • {formatTime(selectedRecording.duration)}
                      </p>
                    </div>
                    <button 
                      className="text-[#007AFF] text-sm font-medium hover:underline"
                      onClick={() => {
                        const summaryText = document.querySelector('.summary-text')?.textContent;
                        if (summaryText) {
                          navigator.clipboard.writeText(summaryText);
                          alert('Summary copied to clipboard');
                        }
                      }}
                    >
                      Export
                    </button>
                  </div>
                </div>
                
                {/* Summary Type Selection & Summary */}
                <SummaryView recordingId={selectedRecording.id} />
                
                {/* AI Chat */}
                <ChatInterface recordingId={selectedRecording.id} />
                
                {/* Transcript */}
                <TranscriptViewer recordingId={selectedRecording.id} />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
