import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatInterfaceProps {
  recordingId: number;
}

const ChatInterface = ({ recordingId }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const { toast } = useToast();
  
  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", `/api/recordings/${recordingId}/chat`, {
        message
      });
      
      if (!response.ok) {
        throw new Error("Failed to get response");
      }
      
      const data = await response.json();
      return data.response;
    },
    onSuccess: (response) => {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: response }
      ]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to get a response",
        variant: "destructive",
      });
    }
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (inputValue.trim() === "") return;
    
    // Add user message to chat
    setMessages(prev => [
      ...prev,
      { role: "user", content: inputValue }
    ]);
    
    // Send to API
    chatMutation.mutate(inputValue);
    
    // Clear input
    setInputValue("");
  };
  
  return (
    <div className="bg-white rounded-[8px] shadow-[0_1px_2px_rgba(0,0,0,0.05),_0_0_0_1px_rgba(0,0,0,0.05)] p-6">
      <h3 className="text-lg font-semibold font-['SF_Pro_Display'] mb-4">Ask about this conversation</h3>
      
      {/* Chat Messages */}
      <div className="space-y-4 mb-4 max-h-[400px] overflow-y-auto">
        {messages.length === 0 && (
          <div className="text-center text-[#86868B] py-10">
            <p>Ask any question about this conversation</p>
            <p className="text-sm mt-1">For example: "What were the main topics discussed?" or "Summarize the action items"</p>
          </div>
        )}
        
        {messages.map((message, index) => (
          <div 
            key={index}
            className={`p-3 rounded-[8px] max-w-[85%] ${
              message.role === "user" 
                ? "bg-[#F5F5F7] mr-auto"
                : "bg-[#007AFF] bg-opacity-10 ml-auto"
            }`}
          >
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
        ))}
        
        {chatMutation.isPending && (
          <div className="bg-[#007AFF] bg-opacity-10 p-3 rounded-[8px] max-w-[85%] ml-auto animate-pulse">
            <p className="text-sm">Thinking...</p>
          </div>
        )}
      </div>
      
      {/* Chat Input */}
      <form onSubmit={handleSubmit} className="relative">
        <input 
          type="text" 
          placeholder="Ask anything about this conversation..." 
          className="w-full px-4 py-3 pr-12 border border-[#E5E5EA] rounded-[8px] focus:outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition duration-200" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={chatMutation.isPending}
        />
        <button 
          type="submit"
          className="absolute right-3 top-3 text-[#007AFF]"
          disabled={chatMutation.isPending || inputValue.trim() === ""}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </form>
    </div>
  );
};

export default ChatInterface;
