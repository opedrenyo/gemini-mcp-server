#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";

const API_KEY = process.env.GOOGLE_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

if (!API_KEY) {
  console.error("GOOGLE_API_KEY environment variable is required");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);
const fileManager = new GoogleAIFileManager(API_KEY);

// Detect MIME type from file extension
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
    ".webm": "video/webm",
    ".mkv": "video/x-matroska",
    ".mpg": "video/mpeg",
    ".mpeg": "video/mpeg",
    ".wmv": "video/x-ms-wmv",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".flac": "audio/flac",
  };
  return types[ext] || "application/octet-stream";
}

// Wait for Gemini to finish processing an uploaded file
async function waitForProcessing(file) {
  let current = file;
  while (current.state === "PROCESSING") {
    await new Promise((r) => setTimeout(r, 5000));
    current = await fileManager.getFile(current.name);
  }
  if (current.state === "FAILED") {
    throw new Error("File processing failed on Gemini side.");
  }
  return current;
}

// Create MCP server
const server = new Server(
  { name: "gemini", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "gemini_chat",
      description:
        "Send a message to Google Gemini AI. Optionally attach a local file (video, image, audio, PDF) for multimodal analysis.",
      inputSchema: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "The prompt or message to send to Gemini",
          },
          file_path: {
            type: "string",
            description:
              "Optional: absolute path to a local file to send along with the message",
          },
        },
        required: ["message"],
      },
    },
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "gemini_chat") {
    return {
      content: [{ type: "text", text: `Unknown tool: ${request.params.name}` }],
      isError: true,
    };
  }

  const { message, file_path } = request.params.arguments;

  try {
    const model = genAI.getGenerativeModel({ model: MODEL });

    // Text-only
    if (!file_path) {
      const result = await model.generateContent(message);
      return {
        content: [{ type: "text", text: result.response.text() }],
      };
    }

    // With file
    if (!fs.existsSync(file_path)) {
      return {
        content: [{ type: "text", text: `File not found: ${file_path}` }],
        isError: true,
      };
    }

    const mimeType = getMimeType(file_path);
    const uploadResult = await fileManager.uploadFile(file_path, {
      mimeType,
      displayName: path.basename(file_path),
    });

    const processedFile = await waitForProcessing(uploadResult.file);

    const result = await model.generateContent([
      message,
      {
        fileData: {
          fileUri: processedFile.uri,
          mimeType: processedFile.mimeType,
        },
      },
    ]);

    // Clean up
    try {
      await fileManager.deleteFile(processedFile.name);
    } catch {
      // Ignore cleanup errors
    }

    return {
      content: [{ type: "text", text: result.response.text() }],
    };
  } catch (e) {
    return {
      content: [{ type: "text", text: `Gemini error: ${e.message}` }],
      isError: true,
    };
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
