# StockBot Desktop App

## 📦 Overview

StockBot now includes a desktop GUI application built with Electron, providing a user-friendly interface for managing stock video downloads.

## 🎯 Features

- **Drag & Drop Interface**: Easily load stockplan.json files
- **Settings Management**: Configure API key and output directory
- **Real-time Progress**: Visual progress bars for search and download operations
- **Results Viewer**: See search results with status indicators
- **Auto-save Settings**: Your API key and preferences are saved between sessions

## 🚀 Running the Desktop App

### Development Mode

```bash
# Start in development mode (with DevTools)
npm run electron:dev
```

### Production Mode

```bash
# Build and run
npm run electron
```

## 📦 Building for Windows

### On Windows Machine

```bash
# Install dependencies
npm install

# Build Windows installer
npm run dist
```

This will create:
- `release/StockBot Setup X.X.X.exe` - Windows installer
- `release/win-unpacked/` - Portable version

### On Linux/Mac (Cross-platform build)

To build Windows installers from Linux/Mac, you need Wine installed:

```bash
# On Ubuntu/Debian
sudo dpkg --add-architecture i386
sudo apt-get update
sudo apt-get install wine wine32 wine64

# Then build
npm run dist
```

## 🎨 UI Components

### 1. Settings Panel
- **API Key**: Your Freepik API key (password-protected input)
- **Output Directory**: Where videos will be saved

### 2. Stock Plan Panel
- Drag & drop zone for stockplan.json
- File info display (scenes count, target clips)

### 3. Actions Panel
- **Search Videos**: Find and score videos matching your plan
- **Download Videos**: Download selected videos
- **Open Output Folder**: Quick access to downloaded files

### 4. Progress Panel
- Real-time progress bar
- Current operation status

### 5. Results Panel
- Summary statistics
- Per-scene status (fulfilled/partial/unfulfilled)

### 6. Log Panel
- Real-time operation log
- Color-coded messages (info/success/error)

## 🔧 Architecture

```
electron/
├── main.ts          # Main process (Node.js backend)
├── preload.ts       # IPC bridge (security layer)
└── renderer/
    ├── index.html   # UI structure
    ├── styles.css   # Styling
    ├── renderer.ts  # UI logic
    └── types.d.ts   # TypeScript definitions
```

### IPC Communication

The app uses secure IPC (Inter-Process Communication):

- **Renderer → Main**: User actions (select file, run search, etc.)
- **Main → Renderer**: Progress updates, results, errors

All communication goes through the `preload.ts` security layer.

## 📝 Usage Example

1. **Start the app**
   ```bash
   npm run electron:dev
   ```

2. **Configure settings**
   - Enter your Freepik API key
   - Select output directory
   - Click "Save Settings"

3. **Load stock plan**
   - Drag & drop `stockplan.json` or click "Select File"
   - Verify the plan details (scenes, clips)

4. **Search for videos**
   - Click "Search Videos"
   - Monitor progress in real-time
   - Review results when complete

5. **Download videos**
   - Click "Download Videos"
   - Wait for downloads to complete
   - Click "Open Output Folder" to view files

## 🛠️ Troubleshooting

### App won't start
- Ensure all dependencies are installed: `npm install`
- Check Node.js version: `node --version` (must be ≥18.0.0)
- Rebuild native modules: `npm rebuild`

### Blank white screen
- Check the console for errors (F12 or Ctrl+Shift+I)
- Verify all HTML/CSS files are in `dist/electron/renderer/`

### API errors
- Verify your API key is correct
- Check internet connection
- Review the log panel for specific error messages

## 🎯 Keyboard Shortcuts

- **F12**: Toggle DevTools (development mode only)
- **Ctrl+R**: Reload app
- **Ctrl+Q**: Quit app

## 📦 Distribution

### Portable Version (No Installation)

The `release/win-unpacked/` folder contains a portable version:
- Copy the entire folder to any location
- Run `StockBot.exe` directly
- No admin rights required

### Installer Version

The `.exe` installer provides:
- Start menu shortcut
- Desktop shortcut
- Automatic updates (future feature)
- Clean uninstallation

## 🔒 Security

- **No internet access** except for Freepik API calls
- **API key** stored locally (not transmitted elsewhere)
- **Context isolation** enabled for renderer process
- **Node integration** disabled in renderer
- **Content Security Policy** enforced

## 🚀 Performance

- **Memory efficient**: Streams video downloads (no buffering)
- **Concurrent downloads**: Configurable (default: 3)
- **Progress tracking**: Real-time without blocking UI
- **Error recovery**: Graceful handling with retry logic

## 📊 Build Output

After successful build:

```
release/
├── StockBot Setup 0.1.0.exe    # Windows installer (NSIS)
├── win-unpacked/               # Portable version
│   ├── StockBot.exe
│   ├── resources/
│   └── ...
└── builder-debug.yml
```

## 🎨 Customization

### Change App Icon

1. Replace `assets/icon.png` with your icon (256x256 PNG)
2. For Windows: Convert to `.ico` and update `package.json`:
   ```json
   "build": {
     "win": {
       "icon": "assets/icon.ico"
     }
   }
   ```

### Modify UI Theme

Edit `electron/renderer/styles.css`:
- Primary color: `#667eea`
- Gradient: `#667eea` → `#764ba2`
- Font: System default

### Add Features

1. Add handler in `electron/main.ts`
2. Expose via `electron/preload.ts`
3. Use in `electron/renderer/renderer.ts`

## 📚 Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [electron-builder Guide](https://www.electron.build/)
- [Freepik API Docs](https://freepik.com/api)
