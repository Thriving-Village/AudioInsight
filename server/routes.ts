import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { existsSync, createWriteStream, mkdirSync } from "fs";
import { openai } from "./openai";
import { Recording } from "@shared/types";

// Configure multer for file uploads
const storage_config = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.resolve("uploads");

    // Create directory if it doesn't exist
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage_config,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /wav|mp3|m4a|mpeg|webm/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }

    cb(new Error("Only audio files are allowed"));
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Create uploads directory if it doesn't exist
  const uploadDir = path.resolve("uploads");
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Get all recordings
  app.get("/api/recordings", async (req, res) => {
    try {
      const recordings = await storage.getAllRecordings();
      res.json(recordings);
    } catch (error) {
      res.status(500).json({ message: "Failed to get recordings", error: error.message });
    }
  });

  // Get a single recording
  app.get("/api/recordings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const recording = await storage.getRecording(id);

      if (!recording) {
        return res.status(404).json({ message: "Recording not found" });
      }

      res.json(recording);
    } catch (error) {
      res.status(500).json({ message: "Failed to get recording", error: error.message });
    }
  });

  // Create a new recording (from recorder)
  app.post("/api/recordings", upload.single("audio"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No audio file provided" });
      }

      const title = req.body.title || "Untitled Recording";
      const duration = parseInt(req.body.duration) || 0;

      const recording = await storage.createRecording({
        title,
        filename: req.file.filename,
        duration,
      });

      // Process the recording asynchronously
      processRecording(recording).catch(err =>
        console.error(`Error processing recording ${recording.id}:`, err)
      );

      res.status(201).json(recording);
    } catch (error) {
      res.status(500).json({ message: "Failed to create recording", error: error.message });
    }
  });

  // Upload an audio file
  app.post("/api/recordings/upload", upload.single("audio"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No audio file provided" });
      }

      const title = path.basename(req.file.originalname, path.extname(req.file.originalname));

      // For uploaded files, we don't have duration info, so set to 0 and update later
      const recording = await storage.createRecording({
        title,
        filename: req.file.filename,
        duration: 0,
      });

      // Process the recording asynchronously
      processRecording(recording).catch(err =>
        console.error(`Error processing recording ${recording.id}:`, err)
      );

      res.status(201).json(recording);
    } catch (error) {
      res.status(500).json({ message: "Failed to upload recording", error: error.message });
    }
  });

  // Delete a recording
  app.delete("/api/recordings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const recording = await storage.getRecording(id);

      if (!recording) {
        return res.status(404).json({ message: "Recording not found" });
      }

      // Delete the actual file
      const filePath = path.resolve("uploads", recording.filename);
      if (existsSync(filePath)) {
        await fs.unlink(filePath);
      }

      // Delete from storage
      await storage.deleteRecording(id);

      res.json({ message: "Recording deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete recording", error: error.message });
    }
  });

  // Get processing status
  app.get("/api/recordings/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const recording = await storage.getRecording(id);

      if (!recording) {
        return res.status(404).json({ message: "Recording not found" });
      }

      // Return processing status based on recording state
      let progress = 0;
      let status = "Processing";

      if (recording.transcribed) {
        progress = 100;
        status = "Completed";
      } else if (recording.processed) {
        progress = 75;
        status = "Generating insights";
      } else {
        progress = 25;
        status = "Transcribing audio";
      }

      res.json({ progress, status });
    } catch (error) {
      res.status(500).json({ message: "Failed to get status", error: error.message });
    }
  });

  // Get transcript for a recording
  app.get("/api/recordings/:id/transcript", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const transcript = await storage.getTranscriptByRecordingId(id);

      res.json(transcript);
    } catch (error) {
      res.status(500).json({ message: "Failed to get transcript", error: error.message });
    }
  });

  // Get summary for a recording
  app.get("/api/recordings/:id/summary/:type", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const type = req.params.type as string;

      const summary = await storage.getSummaryByType(id, type);

      if (!summary) {
        // If no summary exists, generate one
        const recording = await storage.getRecording(id);
        if (!recording) {
          return res.status(404).json({ message: "Recording not found" });
        }

        const transcript = await storage.getTranscriptByRecordingId(id);
        if (!transcript || transcript.length === 0) {
          return res.status(404).json({ message: "Transcript not found" });
        }

        // Combine transcript into a single text
        const transcriptText = transcript.map(t => `${t.speaker} (${Math.floor(t.timestamp / 60)}:${(t.timestamp % 60).toString().padStart(2, '0')}): ${t.text}`).join('\n\n');

        const newSummary = await generateSummary(id, type, transcriptText);
        return res.json(newSummary.content);
      }

      res.json(summary.content);
    } catch (error) {
      res.status(500).json({ message: "Failed to get summary", error: error.message });
    }
  });

  // Chat with a recording
  app.post("/api/recordings/:id/chat", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { message } = req.body;

      if (!message) {
        return res.status(400).json({ message: "No message provided" });
      }

      const recording = await storage.getRecording(id);
      if (!recording) {
        return res.status(404).json({ message: "Recording not found" });
      }

      const transcript = await storage.getTranscriptByRecordingId(id);
      if (!transcript || transcript.length === 0) {
        return res.status(404).json({ message: "Transcript not found" });
      }

      // Save user message
      await storage.createChatMessage({
        recordingId: id,
        role: "user",
        content: message,
      });

      // Generate AI response
      const transcriptText = transcript.map(t => `${t.speaker} (${Math.floor(t.timestamp / 60)}:${(t.timestamp % 60).toString().padStart(2, '0')}): ${t.text}`).join('\n\n');

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are an AI assistant that helps analyze conversation transcripts. 
            Answer questions about the following conversation transcript, providing specific details and insights.
            Use a professional, helpful tone. Keep answers concise but thorough. 
            Only answer based on information in the transcript, don't make up details.
            Format your response with appropriate paragraphs, lists, and spacing for readability.`
          },
          { role: "user", content: `Transcript:\n\n${transcriptText}` },
          { role: "user", content: message }
        ]
      });

      const aiResponse = response.choices[0].message.content;

      // Save AI response
      await storage.createChatMessage({
        recordingId: id,
        role: "assistant",
        content: aiResponse,
      });

      res.json({ response: aiResponse });
    } catch (error) {
      res.status(500).json({ message: "Failed to process chat message", error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Process a recording (transcribe, analyze, etc.)
async function processRecording(recording: Recording): Promise<void> {
  try {
    const filePath = path.resolve("uploads", recording.filename);

    // 1. Transcribe the audio
    console.log(`Transcribing recording ${recording.id}...`);

    // Read the file as a buffer
    const fileBuffer = await fs.readFile(filePath);

    // Create a Blob from the buffer with proper MIME type
    const audioBlob = new Blob([fileBuffer], { type: 'audio/mp3' });

    // Create a File object from the Blob
    const file = new File([audioBlob], path.basename(filePath), { type: 'audio/mp3' });

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });

    // Update recording duration if not already set
    if (recording.duration === 0) {
      await storage.updateRecording(recording.id, {
        ...recording,
        duration: Math.round(transcription.duration || 0),
        processed: true,
      });
    } else {
      await storage.updateRecording(recording.id, {
        ...recording,
        processed: true,
      });
    }

    // 2. Store transcript segments and prepare transcript text for summaries
    console.log(`Storing transcript for recording ${recording.id}...`);
    let transcriptText = "";

    if (transcription.segments) {
      for (const segment of transcription.segments) {
        await storage.createTranscript({
          recordingId: recording.id,
          speaker: "Speaker", // Default as we don't have speaker diarization
          timestamp: Math.round(segment.start),
          text: segment.text,
        });
      }

      // Update recording to mark as transcribed
      await storage.updateRecording(recording.id, {
        ...recording,
        transcribed: true,
      });

      // 3. Generate summaries in the background
      transcriptText = transcription.segments.map(segment =>
        `Speaker (${Math.floor(segment.start / 60)}:${(Math.round(segment.start) % 60).toString().padStart(2, '0')}): ${segment.text}`
      ).join('\n\n');
    } else {
      // Fallback if segments are not available
      await storage.createTranscript({
        recordingId: recording.id,
        speaker: "Speaker",
        timestamp: 0,
        text: transcription.text || "Unable to transcribe audio content",
      });

      // Update recording to mark as transcribed
      await storage.updateRecording(recording.id, {
        ...recording,
        transcribed: true,
      });

      // Fallback transcript text for summaries
      transcriptText = `Speaker (0:00): ${transcription.text || "Unable to transcribe audio content"}`;
    }

    // Generate different summary types
    Promise.all([
      generateSummary(recording.id, 'general', transcriptText),
      generateSummary(recording.id, 'mental-models', transcriptText),
      generateSummary(recording.id, '1-on-1', transcriptText),
      generateSummary(recording.id, 'sales', transcriptText),
      generateSummary(recording.id, 'timeline', transcriptText),
    ]).catch(err => {
      console.error(`Error generating summaries for recording ${recording.id}:`, err);
    });

    console.log(`Processing complete for recording ${recording.id}`);
  } catch (error) {
    console.error(`Error processing recording ${recording.id}:`, error);
    // Update recording to mark as errored
    await storage.updateRecording(recording.id, {
      ...recording,
      processed: true,
      transcribed: true, // Mark as complete to avoid endless retries
    });
  }
}

// Generate a summary based on type
async function generateSummary(recordingId: number, type: string, transcriptText: string): Promise<{ recordingId: number, type: string, content: string }> {
  let promptTemplate = "";

  switch (type) {
    case 'general':
      promptTemplate = `Provide a concise summary of the following conversation transcript. 
      Highlight the key topics discussed, decisions made, and action items. 
      Format with clear paragraphs and bullet points where appropriate.`;
      break;
    case 'mental-models':
      promptTemplate = `Analyze the following conversation transcript using mental models. 
      Identify the thinking patterns, cognitive biases, decision-making frameworks, and 
      problem-solving approaches demonstrated. Provide insights on how these mental models 
      affected the conversation and outcomes.`;
      break;
    case '1-on-1':
      promptTemplate = `Summarize this 1-on-1 meeting transcript with a focus on:
      1. Main discussion points
      2. Feedback exchanged
      3. Goals and expectations discussed
      4. Growth opportunities identified
      5. Action items and next steps
      Format this as a structured meeting summary.`;
      break;
    case 'sales':
      promptTemplate = `Analyze this sales conversation transcript. Focus on:
      1. Customer pain points and needs identified
      2. Objections raised and how they were addressed
      3. Value propositions presented
      4. Next steps agreed upon
      5. Areas for improvement in the sales approach
      Provide actionable insights for sales follow-up.`;
      break;
    case 'timeline':
      promptTemplate = `Create a chronological timeline breakdown of this conversation. 
      Structure it by time segments, highlighting when key topics shifted, important decisions
      were made, or new information was introduced. Make it easy to see the conversation flow 
      and progression of ideas.`;
      break;
    default:
      promptTemplate = `Provide a general summary of the following conversation transcript.`;
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    messages: [
      {
        role: "system",
        content: `You are an AI assistant that helps analyze conversation transcripts. 
        ${promptTemplate} Be concise but thorough. Format your response for readability with 
        appropriate paragraphs, lists, and spacing.`
      },
      { role: "user", content: transcriptText }
    ]
  });

  const summary = response.choices[0].message.content;

  // Store the summary
  const storedSummary = await storage.createSummary({
    recordingId,
    type,
    content: summary,
  });

  return storedSummary;
}
