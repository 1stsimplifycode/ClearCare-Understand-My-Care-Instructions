# Deployment

## Windows (recommended for testing)

1. Install **Node.js 22 LTS** (22.13 or newer) from nodejs.org. Node 18–21 also works: the server then uses the original PDF parser, and the browser still uses pdf.js.
2. Unzip the project.
3. Optional: copy `.env.example` to `.env` and set `RADEON_API_KEY=` to your AMD Token Factory key.
4. Double-click **`TEST_CLEARCARE.bat`**. It runs:
   - a syntax check;
   - the 92 automated tests;
   - a smoke test against the real server (one live AMD call only if a key is set);
   - optionally, the 23 browser tests. These install Playwright and Chromium locally the first time.

   It writes `test-results.txt` and `smoke-results.txt`, then offers to start the app.
5. Double-click **`CREATE_DESKTOP_SHORTCUT.bat`** once. It puts a **ClearCare** icon on your Desktop and in the Start menu.
6. Open **ClearCare** from that icon, or from `START_CLEARCARE.bat`.
   - `ClearCare.ps1` starts the local server hidden.
   - It opens ClearCare in its own desktop window, using Microsoft Edge app mode (Chrome if Edge is missing), at 1366×900 with a dedicated profile.
   - It stops the server when you close the window.
   - Logs are written to `%LOCALAPPDATA%\ClearCare\server*.log`.

## Optional local OCR for scanned PDFs

Install Tesseract (UB Mannheim build) and Poppler (`pdftoppm`), and add both to `PATH`. Add the `hin` and `spa` language data for Hindi and Spanish scans. `/api/v2/status` shows what was detected.

## Voices

Speech uses the voices installed in the operating system and browser. On Windows, go to Settings › Time & language › Speech › Add voices and add Hindi (India) and Spanish. Edge also offers online "Natural" voices; tick them in ClearCare's preferences only if you accept that text goes to Microsoft.

## Environment variables

| Variable | Purpose |
|---|---|
| `RADEON_API_KEY` | AMD key. Server only. |
| `PORT` | Default 4173 |
| `CLEARCARE_AMD_BASE_URL` | Tests only; loopback hosts only |

## Network

The server binds to loopback only. **Do not** expose it on a LAN or the internet: it has no authentication or TLS (see `SECURITY_AUDIT.md`).
