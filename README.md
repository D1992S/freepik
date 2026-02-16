# 🎬 StockBot - Automated Freepik Video Downloader

<div align="center">

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**Automatically search, score, and download stock videos from Freepik based on your creative brief.**

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Documentation](#-documentation)

</div>

---

## 📖 Overview

StockBot is a powerful automation tool that helps you find and download the perfect stock videos from Freepik. Simply define your video requirements in a structured plan, and StockBot will:

1. **Search** Freepik's extensive video library
2. **Score** candidates using a deterministic algorithm
3. **Select** the best matches for each scene
4. **Download** videos automatically with concurrency control

Available in **two modes**:
- **CLI**: Command-line interface for automation and scripting
- **Desktop App**: Beautiful Electron GUI for visual workflow

---

## ✨ Features

### Core Functionality
- ✅ **Intelligent Scoring**: 4-factor algorithm (resolution, duration, relevance, recency)
- ✅ **Smart Filtering**: Duration, resolution, orientation, negative terms
- ✅ **Concurrent Downloads**: Configurable parallel downloads (default: 3)
- ✅ **Progress Tracking**: Real-time status updates
- ✅ **Error Recovery**: Graceful shutdown, idempotent operations
- ✅ **Caching**: LRU cache with TTL to minimize API calls

### Desktop App Features
- 🎨 **Beautiful UI**: Modern gradient design with smooth animations
- 📁 **Drag & Drop**: Easy stockplan.json import
- ⚡ **Real-time Progress**: Visual progress bars and live logs
- 📊 **Results Viewer**: Per-scene status with color coding
- ⚙️ **Settings Manager**: Persistent API key and preferences
- 🔒 **Secure**: Context isolation and content security policy

---

## 🚀 Installation

### Prerequisites
- **Node.js** ≥18.0.0
- **npm** or **yarn**
- **Freepik API Key** ([Get one here](https://freepik.com/api))

### Quick Start

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Add your Freepik API key to .env
# FREEPIK_API_KEY=your_key_here

# Build the project
npm run build
```

---

## 💻 Usage

### Desktop App (Recommended)

```bash
# Start in development mode (with DevTools)
npm run electron:dev

# Or build and run production mode
npm run electron
```

**Desktop App Workflow:**
1. Enter your API key in Settings
2. Drag & drop your `stockplan.json` file
3. Click "Search Videos" to find candidates
4. Review results in the Results panel
5. Click "Download Videos" to download selected clips
6. Click "Open Output Folder" to view downloaded files

### CLI Mode

```bash
# Validate stock plan
npm run dev -- validate examples/stockplan.json

# Search for videos
npm run dev -- search examples/stockplan.json --output ./output

# Download selected videos
npm run dev -- download examples/stockplan.json --output ./output
```

---

## 📋 Stock Plan Format

Create a `stockplan.json` file defining your video requirements. See `tests/fixtures/valid-stockplan.json` for examples.

Key fields:
- **scenes**: Array of scene definitions
- **global settings**: Default values for all scenes
- **search_queries**: Terms to search for
- **negative_terms**: Terms to exclude
- **duration/resolution constraints**: Filter criteria

---

## 📊 Scoring Algorithm

StockBot uses a deterministic 100-point scoring system:

| Factor | Weight | Criteria |
|--------|--------|----------|
| **Resolution** | 40% | 4K=40, 1440p=30, 1080p=20, <1080p=5 |
| **Duration Fit** | 25% | Distance from middle of target range |
| **Relevance** | 25% | Search query term matching |
| **Recency** | 10% | Linear decay over 365 days |

---

## 📁 Output Structure

```
output/
├── 001_scene-slug/
│   ├── 001_scene-slug__freepik_123456__a.mp4
│   └── scene.json
└── _meta/
    ├── candidates.json
    ├── selection.json
    └── errors.jsonl
```

---

## 📦 Building Windows App

```bash
# Build desktop app
npm run build:electron

# Create Windows installer (on Windows or Linux with Wine)
npm run dist
```

Output: `release/StockBot Setup 0.1.0.exe`

---

## 📚 Documentation

- **[Desktop App Guide](docs/DESKTOP_APP.md)** - Full desktop app documentation
- **[STATUS.md](docs/STATUS.md)** - Project status and implementation details
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System architecture
- **[ADRs](docs/adr/)** - Architecture Decision Records

---

## 🧪 Testing

```bash
# Run all tests (58 passing)
npm test

# Lint code
npm run lint

# Type check
npm run typecheck
```

---

## 📄 License

MIT License

---

<div align="center">

**Made with ❤️ using TypeScript, Electron, and Freepik API**

</div>
