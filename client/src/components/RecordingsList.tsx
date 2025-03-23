import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatTime } from "@/utils/formatTime";
import { Recording } from "@shared/types";

interface RecordingsListProps {
  onSelectRecording: (recording: Recording) => void;
}

const RecordingsList = ({ onSelectRecording }: RecordingsListProps) => {
  const { toast } = useToast();
  
  const { data: recordings, isLoading, error } = useQuery<Recording[]>({
    queryKey: ['/api/recordings'],
  });
  
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/recordings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recordings'] });
      toast({
        title: "Recording deleted",
        description: "The recording has been removed from your list",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete recording",
        variant: "destructive",
      });
    }
  });
  
  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this recording?")) {
      deleteMutation.mutate(id);
    }
  };
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-[8px] shadow-[0_1px_2px_rgba(0,0,0,0.05),_0_0_0_1px_rgba(0,0,0,0.05)] p-6">
        <h3 className="text-lg font-semibold font-['SF_Pro_Display'] mb-4">Recent recordings</h3>
        <div className="py-4 text-[#86868B] text-center">Loading recordings...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-white rounded-[8px] shadow-[0_1px_2px_rgba(0,0,0,0.05),_0_0_0_1px_rgba(0,0,0,0.05)] p-6">
        <h3 className="text-lg font-semibold font-['SF_Pro_Display'] mb-4">Recent recordings</h3>
        <div className="py-4 text-red-500 text-center">Error loading recordings</div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-[8px] shadow-[0_1px_2px_rgba(0,0,0,0.05),_0_0_0_1px_rgba(0,0,0,0.05)] p-6">
      <h3 className="text-lg font-semibold font-['SF_Pro_Display'] mb-4">Recent recordings</h3>
      
      {(!recordings || recordings.length === 0) && (
        <div className="py-4 text-[#86868B] text-center">No recordings found</div>
      )}
      
      {recordings && recordings.map((recording, index) => {
        const isLastItem = index === recordings.length - 1;
        
        return (
          <div 
            key={recording.id}
            className={`py-3 flex justify-between items-center cursor-pointer hover:bg-[#F5F5F7] transition-colors rounded-md pl-2 pr-1 ${!isLastItem ? "border-b border-[#E5E5EA]" : ""}`}
            onClick={() => onSelectRecording(recording)}
          >
            <div>
              <h4 className="font-medium">{recording.title}</h4>
              <p className="text-[#86868B] text-sm">
                {new Date(recording.createdAt).toLocaleDateString()} • {formatTime(recording.duration)}
              </p>
            </div>
            <div className="flex space-x-2">
              <button 
                className="text-[#007AFF] p-2 rounded-full hover:bg-[#F5F5F7]"
                onClick={(e) => handleDelete(e, recording.id)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button className="text-[#007AFF]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RecordingsList;
