import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const recordings = pgTable("recordings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  filename: text("filename").notNull(),
  duration: integer("duration").notNull(),
  processed: boolean("processed").default(false),
  transcribed: boolean("transcribed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transcripts = pgTable("transcripts", {
  id: serial("id").primaryKey(),
  recordingId: integer("recording_id").notNull(),
  speaker: text("speaker"),
  timestamp: integer("timestamp").notNull(),
  text: text("text").notNull(),
});

export const summaries = pgTable("summaries", {
  id: serial("id").primaryKey(),
  recordingId: integer("recording_id").notNull(),
  type: text("type").notNull(), // general, mental-models, 1-on-1, sales, timeline
  content: text("content").notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  recordingId: integer("recording_id").notNull(),
  role: text("role").notNull(), // user or assistant
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertRecordingSchema = createInsertSchema(recordings).pick({
  title: true,
  filename: true,
  duration: true,
});

export const insertTranscriptSchema = createInsertSchema(transcripts).pick({
  recordingId: true,
  speaker: true,
  timestamp: true,
  text: true,
});

export const insertSummarySchema = createInsertSchema(summaries).pick({
  recordingId: true,
  type: true,
  content: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  recordingId: true,
  role: true,
  content: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertRecording = z.infer<typeof insertRecordingSchema>;
export type Recording = typeof recordings.$inferSelect;

export type InsertTranscript = z.infer<typeof insertTranscriptSchema>;
export type Transcript = typeof transcripts.$inferSelect;

export type InsertSummary = z.infer<typeof insertSummarySchema>;
export type Summary = typeof summaries.$inferSelect;

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
