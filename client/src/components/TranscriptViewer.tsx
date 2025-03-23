import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

interface TranscriptChunk {
  speaker: string;
  timestamp: number;
  text: string;
}

interface TranscriptViewerProps {
  recordingId: number;
}

const TranscriptViewer = ({ recordingId }: TranscriptViewerProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [expandedTranscript, setExpandedTranscript] = useState(false);
  
  const { data: transcript, isLoading, error } = useQuery<TranscriptChunk[]>({
    queryKey: [`/api/recordings/${recordingId}/transcript`],
  });
  
  const filteredTranscript = transcript?.filter(chunk => 
    chunk.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chunk.speaker.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const displayedTranscript = expandedTranscript
    ? filteredTranscript || []
    : (filteredTranscript || []).slice(0, 5);
  
  const formatTimestamp = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="bg-white rounded-[8px] shadow-[0_1px_2px_rgba(0,0,0,0.05),_0_0_0_1px_rgba(0,0,0,0.05)] p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold font-['SF_Pro_Display']">Full Transcript</h3>
        <button 
          className="text-[#007AFF] text-sm font-medium hover:underline"
          onClick={() => setShowSearch(!showSearch)}
        >
          {showSearch ? "Hide Search" : "Search"}
        </button>
      </div>
      
      {showSearch && (
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search transcript..."
            className="w-full px-4 py-2 border border-[#E5E5EA] rounded-[8px] focus:outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition duration-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}
      
      <div className="space-y-4 font-['SF_Mono'] text-sm text-[#1D1D1F]">
        {isLoading && (
          <div className="py-4 text-center text-[#86868B]">Loading transcript...</div>
        )}
        
        {error && (
          <div className="py-4 text-center text-red-500">Failed to load transcript</div>
        )}
        
        {!isLoading && !error && (!transcript || transcript.length === 0) && (
          <div className="py-4 text-center text-[#86868B]">No transcript available</div>
        )}
        
        {displayedTranscript.map((chunk, index) => (
          <div key={index}>
            <p className="font-medium">{chunk.speaker} ({formatTimestamp(chunk.timestamp)}):</p>
            <p className="whitespace-pre-wrap">{chunk.text}</p>
          </div>
        ))}
        
        {!isLoading && filteredTranscript && filteredTranscript.length > 5 && !expandedTranscript && (
          <div className="text-center py-2">
            <button 
              className="text-[#007AFF] text-sm font-medium hover:underline"
              onClick={() => setExpandedTranscript(true)}
            >
              Show more
            </button>
          </div>
        )}
        
        {expandedTranscript && (
          <div className="text-center py-2">
            <button 
              className="text-[#007AFF] text-sm font-medium hover:underline"
              onClick={() => setExpandedTranscript(false)}
            >
              Show less
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TranscriptViewer;
