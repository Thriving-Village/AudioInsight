import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { SegmentedControl } from "./SegmentedControl";

type SummaryType = 'general' | 'mental-models' | '1-on-1' | 'sales' | 'timeline';

interface SummaryViewProps {
  recordingId: number;
}

const SummaryView = ({ recordingId }: SummaryViewProps) => {
  const [selectedType, setSelectedType] = useState<SummaryType>('general');
  
  const { data: summary, isLoading, error } = useQuery<string>({
    queryKey: [`/api/recordings/${recordingId}/summary/${selectedType}`],
  });
  
  const summaryTypes = [
    { value: 'general', label: 'General' },
    { value: 'mental-models', label: 'Mental Models' },
    { value: '1-on-1', label: '1-on-1' },
    { value: 'sales', label: 'Sales' },
    { value: 'timeline', label: 'Timeline' },
  ];
  
  return (
    <>
      <div className="bg-white rounded-[8px] shadow-[0_1px_2px_rgba(0,0,0,0.05),_0_0_0_1px_rgba(0,0,0,0.05)] p-4">
        <div className="overflow-x-auto pb-2">
          <SegmentedControl
            segments={summaryTypes}
            value={selectedType}
            onChange={setSelectedType as (value: string) => void}
          />
        </div>
      </div>
      
      <div className="bg-white rounded-[8px] shadow-[0_1px_2px_rgba(0,0,0,0.05),_0_0_0_1px_rgba(0,0,0,0.05)] p-6">
        <h3 className="text-lg font-semibold font-['SF_Pro_Display'] mb-4">Summary</h3>
        
        {isLoading && (
          <div className="space-y-4 animate-pulse">
            <div className="h-4 bg-[#F5F5F7] rounded w-3/4"></div>
            <div className="h-4 bg-[#F5F5F7] rounded"></div>
            <div className="h-4 bg-[#F5F5F7] rounded w-5/6"></div>
            <div className="h-4 bg-[#F5F5F7] rounded w-4/5"></div>
            <div className="h-4 bg-[#F5F5F7] rounded w-2/3"></div>
          </div>
        )}
        
        {error && (
          <div className="py-4 text-red-500">
            Failed to load summary. Please try again later.
          </div>
        )}
        
        {!isLoading && !error && !summary && (
          <div className="py-4 text-[#86868B] text-center">
            No summary available for this recording.
          </div>
        )}
        
        {!isLoading && !error && summary && (
          <div className="space-y-4 whitespace-pre-wrap">
            {summary.split('\n\n').map((paragraph, i) => {
              // Check if the paragraph is a list
              if (paragraph.includes('• ')) {
                const [listHeader, ...listItems] = paragraph.split('• ');
                return (
                  <div key={i}>
                    {listHeader && <p className="text-[#1D1D1F]">{listHeader}</p>}
                    <ul className="list-disc pl-5 space-y-1">
                      {listItems.map((item, j) => (
                        <li key={j}>{item.trim()}</li>
                      ))}
                    </ul>
                  </div>
                );
              }
              // Check if the paragraph is numbered
              else if (/^\d+\./.test(paragraph)) {
                return (
                  <ol className="list-decimal pl-5 space-y-1" key={i}>
                    {paragraph.split(/\d+\.\s/).filter(Boolean).map((item, j) => (
                      <li key={j}>{item.trim()}</li>
                    ))}
                  </ol>
                );
              } 
              // Regular paragraph
              else {
                return <p key={i} className="text-[#1D1D1F]">{paragraph}</p>;
              }
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default SummaryView;
