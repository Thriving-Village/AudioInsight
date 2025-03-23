interface Segment {
  value: string;
  label: string;
}

interface SegmentedControlProps {
  segments: Segment[];
  value: string;
  onChange: (value: string) => void;
}

export const SegmentedControl = ({ segments, value, onChange }: SegmentedControlProps) => {
  return (
    <div className="inline-flex bg-[#F2F2F7] rounded-[8px] p-[2px]">
      {segments.map((segment) => (
        <button
          key={segment.value}
          className={`rounded-[6px] px-4 py-2 text-sm font-medium transition-all duration-200 whitespace-nowrap ${
            value === segment.value 
              ? "bg-white text-[#1D1D1F] shadow-[0_2px_4px_rgba(0,0,0,0.1)]" 
              : "text-[#86868B] hover:text-[#1D1D1F]"
          }`}
          onClick={() => onChange(segment.value)}
        >
          {segment.label}
        </button>
      ))}
    </div>
  );
};
