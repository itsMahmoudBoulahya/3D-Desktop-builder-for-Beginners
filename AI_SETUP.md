# AI-Powered Connectivity Testing Setup

This document explains how to set up the AI-powered connectivity testing feature that uses Llama 3 via Ollama locally with Vercel AI SDK.

## Prerequisites

### 1. Install Ollama

Download and install Ollama from: https://ollama.ai/

**For Windows:**
- Download the installer from the official website
- Run the installer and follow the setup wizard
- Ollama will be available via command line

**For macOS:**
- Download the .dmg file and install
- Or use Homebrew: `brew install ollama`

**For Linux:**
- Run: `curl -fsSL https://ollama.ai/install.sh | sh`

### 2. Download Llama 3 Model

After installing Ollama, download the Llama 3 model:

```bash
ollama pull llama3
```

This will download the model (approximately 4-7GB depending on the variant).

### 3. Start Ollama Service

Make sure Ollama is running before using the AI features:

```bash
ollama serve
```

Keep this terminal open while using the application.

### 4. Verify Ollama is Working

Test that Ollama is running with the OpenAI-compatible API:

```bash
curl http://localhost:11434/v1/models
```

You should see a response listing the available models including `llama3`.

## Usage

### Test 2: AI Connectivity Analysis

1. **Place Components**: Drag components from the "Composants" tab to the 3D scene
2. **Connect Components**: Click on components and use the "Connecter" button to establish connections
3. **Run Analysis**: Go to the "Tests" tab and click "Analyser la connectivité" in Test 2
4. **Review Results**: The AI will provide:
   - Overall score (0-100)
   - Validation status (correct/incorrect)
   - Detailed feedback in French
   - List of issues found
   - Suggestions for improvement

### What the AI Analyzes

The AI evaluates:

- **Power Connections**: Are power-requiring components connected to power sources?
- **Data Connections**: Are input/output devices properly connected for data transfer?
- **Logical Setup**: Does the configuration represent a functional workstation?
- **Educational Accuracy**: Are connections pedagogically correct?

### Example Connection Rules

- Central Unit → Power Strip → Wall Outlet
- Keyboard/Mouse → USB ports on Central Unit
- Monitor → HDMI port on Central Unit
- USB Adapter → USB port on Central Unit
- Audio devices → Audio ports on Central Unit

## Troubleshooting

### "Service d'IA non disponible"
- Check if Ollama is running: `ollama serve`
- Verify Llama3 is installed: `ollama list`
- Restart Ollama service

### Slow Analysis
- First run may be slower as the model loads
- Subsequent analyses will be faster
- Consider using a smaller model variant if performance is an issue

### Model Not Found
- Ensure you've run: `ollama pull llama3`
- Check available models: `ollama list`

## Technical Implementation

The system uses:
- **Vercel AI SDK**: For AI integration with clean TypeScript APIs
- **OpenAI-compatible Provider**: Connects to Ollama's API endpoint
- **Model**: `llama3` (default variant)
- **Temperature**: 0.3 (for consistent, focused responses)
- **Endpoint**: `http://localhost:11434/v1` (Ollama's OpenAI-compatible API)

### Configuration

The AI analyzer is configured in `src/lib/connectivity-analyzer.ts`:

```typescript
private ollama = createOpenAI({
  baseURL: 'http://localhost:11434/v1',
  apiKey: 'ollama', // Dummy key for local instance
});

private model = this.ollama('llama3');
```

### Fallback System

If the AI service is unavailable, the system automatically falls back to a rule-based analyzer that provides educational feedback without AI.

## Development Notes

- **AI Responses**: Generated in French to match the educational context
- **Structured Output**: Responses follow a strict JSON format for consistent parsing
- **Error Handling**: Comprehensive fallback system for network/service issues
- **Educational Focus**: Prompts are designed for pedagogical value, not just technical accuracy

## Performance Tips

- Keep Ollama running in the background during development
- The model stays loaded in memory after first use
- Consider using `llama3:8b` for faster responses on lower-end hardware
- Use `llama3:70b` for more detailed analysis if you have sufficient resources

## Troubleshooting AI Issues

If you see `[Service IA non disponible - analyse basique utilisée]` in the feedback:
1. Check if Ollama is running: `ollama serve`
2. Verify the model is available: `ollama list`
3. Test the API endpoint: `curl http://localhost:11434/v1/models`
4. Check browser console for detailed error messages
