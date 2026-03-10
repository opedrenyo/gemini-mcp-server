# gemini-mcp-server

MCP server that connects Claude Desktop to Google Gemini. Send text prompts or attach local files (video, image, audio, PDF) for multimodal analysis.

## What it does

Exposes a single tool — `gemini_chat` — that lets Claude send messages to Gemini, optionally with a file attachment. Files are uploaded to the Gemini File API, processed, and cleaned up automatically after use.

**Supported file types:** MP4, MOV, AVI, WebM, MKV, MPG, WMV, PNG, JPG, GIF, WebP, PDF, MP3, WAV, OGG, FLAC.

## Setup

### 1. Get a Google API key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click **Create API Key** and select a Google Cloud project (or create one)
4. Copy the generated key

The free tier is generous for most use cases. See the [Gemini API docs](https://ai.google.dev/gemini-api/docs/api-key) for details on quotas and pricing.

### 2. Install

```bash
git clone https://github.com/opedrenyo/gemini-mcp-server.git
cd gemini-mcp-server
npm install
```

### 3. Configure Claude Desktop

Add this to your `claude_desktop_config.json`:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "gemini": {
      "command": "node",
      "args": ["/absolute/path/to/gemini-mcp-server/index.js"],
      "env": {
        "GOOGLE_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

Replace `/absolute/path/to/` with the actual path where you cloned the repo.

### 4. Restart Claude Desktop

The `gemini_chat` tool will be available in your next conversation.

## Configuration

| Environment variable | Required | Default | Description |
|---|---|---|---|
| `GOOGLE_API_KEY` | Yes | — | Google AI Studio API key |
| `GEMINI_MODEL` | No | `gemini-2.0-flash` | Model to use |

## Usage examples

**Text only:**
> "Ask Gemini to explain quantum computing in simple terms"

**With file:**
> "Analyze this video" + file_path: `/path/to/video.mp4`

## License

MIT
