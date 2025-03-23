import { 
  users, type User, type InsertUser,
  recordings, type Recording, type InsertRecording,
  transcripts, type Transcript, type InsertTranscript,
  summaries, type Summary, type InsertSummary,
  chatMessages, type ChatMessage, type InsertChatMessage
} from "@shared/schema";

// Storage interface for CRUD operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Recording operations
  getRecording(id: number): Promise<Recording | undefined>;
  getAllRecordings(): Promise<Recording[]>;
  createRecording(recording: InsertRecording): Promise<Recording>;
  updateRecording(id: number, recording: Partial<Recording>): Promise<Recording>;
  deleteRecording(id: number): Promise<void>;
  
  // Transcript operations
  getTranscript(id: number): Promise<Transcript | undefined>;
  getTranscriptByRecordingId(recordingId: number): Promise<Transcript[]>;
  createTranscript(transcript: InsertTranscript): Promise<Transcript>;
  
  // Summary operations
  getSummary(id: number): Promise<Summary | undefined>;
  getSummaryByType(recordingId: number, type: string): Promise<Summary | undefined>;
  createSummary(summary: InsertSummary): Promise<Summary>;
  
  // Chat operations
  getChatMessages(recordingId: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private recordings: Map<number, Recording>;
  private transcripts: Map<number, Transcript>;
  private summaries: Map<number, Summary>;
  private chatMessages: Map<number, ChatMessage>;
  
  private userIdCounter: number;
  private recordingIdCounter: number;
  private transcriptIdCounter: number;
  private summaryIdCounter: number;
  private chatMessageIdCounter: number;

  constructor() {
    this.users = new Map();
    this.recordings = new Map();
    this.transcripts = new Map();
    this.summaries = new Map();
    this.chatMessages = new Map();
    
    this.userIdCounter = 1;
    this.recordingIdCounter = 1;
    this.transcriptIdCounter = 1;
    this.summaryIdCounter = 1;
    this.chatMessageIdCounter = 1;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Recording operations
  async getRecording(id: number): Promise<Recording | undefined> {
    return this.recordings.get(id);
  }
  
  async getAllRecordings(): Promise<Recording[]> {
    return Array.from(this.recordings.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async createRecording(insertRecording: InsertRecording): Promise<Recording> {
    const id = this.recordingIdCounter++;
    const now = new Date().toISOString();
    
    const recording: Recording = {
      ...insertRecording,
      id,
      processed: false,
      transcribed: false,
      createdAt: now,
    };
    
    this.recordings.set(id, recording);
    return recording;
  }
  
  async updateRecording(id: number, updateData: Partial<Recording>): Promise<Recording> {
    const recording = this.recordings.get(id);
    
    if (!recording) {
      throw new Error(`Recording with id ${id} not found`);
    }
    
    const updatedRecording = { ...recording, ...updateData };
    this.recordings.set(id, updatedRecording);
    
    return updatedRecording;
  }
  
  async deleteRecording(id: number): Promise<void> {
    // Delete recording
    this.recordings.delete(id);
    
    // Delete associated transcripts
    for (const [transcriptId, transcript] of this.transcripts.entries()) {
      if (transcript.recordingId === id) {
        this.transcripts.delete(transcriptId);
      }
    }
    
    // Delete associated summaries
    for (const [summaryId, summary] of this.summaries.entries()) {
      if (summary.recordingId === id) {
        this.summaries.delete(summaryId);
      }
    }
    
    // Delete associated chat messages
    for (const [messageId, message] of this.chatMessages.entries()) {
      if (message.recordingId === id) {
        this.chatMessages.delete(messageId);
      }
    }
  }
  
  // Transcript operations
  async getTranscript(id: number): Promise<Transcript | undefined> {
    return this.transcripts.get(id);
  }
  
  async getTranscriptByRecordingId(recordingId: number): Promise<Transcript[]> {
    return Array.from(this.transcripts.values())
      .filter(transcript => transcript.recordingId === recordingId)
      .sort((a, b) => a.timestamp - b.timestamp);
  }
  
  async createTranscript(insertTranscript: InsertTranscript): Promise<Transcript> {
    const id = this.transcriptIdCounter++;
    
    const transcript: Transcript = {
      ...insertTranscript,
      id,
    };
    
    this.transcripts.set(id, transcript);
    return transcript;
  }
  
  // Summary operations
  async getSummary(id: number): Promise<Summary | undefined> {
    return this.summaries.get(id);
  }
  
  async getSummaryByType(recordingId: number, type: string): Promise<Summary | undefined> {
    return Array.from(this.summaries.values())
      .find(summary => summary.recordingId === recordingId && summary.type === type);
  }
  
  async createSummary(insertSummary: InsertSummary): Promise<Summary> {
    const id = this.summaryIdCounter++;
    
    const summary: Summary = {
      ...insertSummary,
      id,
    };
    
    this.summaries.set(id, summary);
    return summary;
  }
  
  // Chat operations
  async getChatMessages(recordingId: number): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values())
      .filter(message => message.recordingId === recordingId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }
  
  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = this.chatMessageIdCounter++;
    const now = new Date().toISOString();
    
    const message: ChatMessage = {
      ...insertMessage,
      id,
      timestamp: now,
    };
    
    this.chatMessages.set(id, message);
    return message;
  }
}

export const storage = new MemStorage();
