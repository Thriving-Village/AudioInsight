export interface Recording {
  id: number;
  title: string;
  filename: string;
  duration: number;
  processed: boolean;
  transcribed: boolean;
  createdAt: string;
}

export interface TranscriptSegment {
  id: number;
  recordingId: number;
  speaker: string;
  timestamp: number;
  text: string;
}

export interface SummaryType {
  id: number;
  recordingId: number;
  type: 'general' | 'mental-models' | '1-on-1' | 'sales' | 'timeline';
  content: string;
}

export interface ChatMessage {
  id: number;
  recordingId: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ProcessingStatus {
  progress: number;
  status: string;
}
