# PomPulse 🍅

A beautiful and colorful Pomodoro timer for your terminal that helps you stay productive and maintain a healthy work-break balance.

## Features

- 🎯 25-minute focused work sessions
- ⏰ Automatic break management (5-minute short breaks, 15-minute long breaks)
- 📊 Track your productivity with session summaries
- 🎨 Beautiful, colorful terminal interface with ASCII art
- 🔔 Sound notifications for session completion
- 💾 Persistent storage of your Pomodoro statistics
- ⚡ Fast and lightweight Node.js implementation

## Installation

You can install PomPulse globally using npm:

```bash
npm install -g pompulse
```

Or, if you want to install from source:

1. Clone this repository:
```bash
git clone https://github.com/leox255/pompulse.git
cd pompulse
```

2. Install globally from the local directory:
```bash
npm install -g .
```

## Usage

Once installed, you can use PomPulse from anywhere in your terminal:

Start a Pomodoro session:
```bash
pp start
```

View your productivity summary:
```bash
pp summary
```

Toggle sound notifications:
```bash
pp sound
```

To pause/exit the timer, press `Ctrl+C`. This will show your productivity summary before exiting.

## How it works

PomPulse follows the Pomodoro Technique:
- 25-minute focused work sessions
- 5-minute short breaks between sessions
- After 4 Pomodoros, take a 15-minute long break
- Tracks your progress and maintains statistics
- Plays sound notifications when sessions end

## Features

- Beautiful ASCII art title using figlet
- Colorful interface using chalk
- Smooth progress bar animation
- Sound notifications for better time management
- Persistent statistics storage
- Clean and intuitive CLI interface

## Requirements

- Node.js >= 14.0.0
- macOS, Linux, or Windows

## Contributing

Feel free to submit issues and enhancement requests! 