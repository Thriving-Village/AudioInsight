import { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  isRecording: boolean;
}

const AudioVisualizer = ({ isRecording }: AudioVisualizerProps) => {
  const barRefs = useRef<(HTMLSpanElement | null)[]>([]);
  
  useEffect(() => {
    let animationId: number;
    
    const animateBars = () => {
      if (!isRecording) {
        // Show static bars when not recording
        barRefs.current.forEach((bar) => {
          if (bar) {
            bar.style.height = `${10 + Math.floor(Math.random() * 10)}px`;
          }
        });
        return;
      }
      
      // Animate bars when recording
      barRefs.current.forEach((bar) => {
        if (bar) {
          const height = Math.floor(Math.random() * 35) + 5;
          bar.style.height = `${height}px`;
        }
      });
      
      animationId = requestAnimationFrame(animateBars);
    };
    
    if (isRecording) {
      animationId = requestAnimationFrame(animateBars);
    } else {
      // Just run once to set static bars
      animateBars();
    }
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isRecording]);
  
  // Create 20 bars
  const bars = Array.from({ length: 20 }).map((_, i) => (
    <span 
      key={i} 
      ref={(el) => (barRefs.current[i] = el)} 
      className="audio-bar w-[2px] mx-[1px] bg-secondary transition-all duration-200"
      style={{ 
        height: '10px',
        animationDelay: `${i * 0.08}s`
      }}
    />
  ));
  
  return (
    <div className="audio-wave flex items-center h-[50px]">
      {bars}
    </div>
  );
};

export default AudioVisualizer;
