# QuickBallot v1.0

An offline-first desktop application for managing elections in schools and small organizations, built with Electron, React, and TypeScript.

## Features

- **Offline-First**: All core functions work without internet connectivity
- **Cross-Platform**: Runs on Windows and Linux
- **Modern UI**: Built with React Bootstrap and Material Icons
- **Secure**: Local SQLite database with encryption
- **User-Friendly**: Intuitive interface with dark mode support

## Tech Stack

- **Framework**: Electron 27 + React 18 + TypeScript 5
- **UI**: React Bootstrap 5 + SCSS + Material Icons
- **State Management**: Redux Toolkit + RTK Query
- **Database**: SQLite (better-sqlite3)
- **Build Tool**: Vite 5
- **Charts**: Chart.js for data visualization

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd QuickBallot
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run electron:dev
```

### Available Scripts

- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run electron:dev` - Start Electron in development mode
- `npm run electron:build` - Build Electron app for distribution
- `npm run electron:preview` - Preview production build

## Project Structure

```
QuickBallot/
├── electron/           # Electron main process files
│   ├── main.ts        # Main process entry point
│   └── preload.ts     # Preload script
├── src/               # React application
│   ├── components/    # React components
│   ├── store/         # Redux store configuration
│   ├── styles/        # SCSS stylesheets
│   ├── App.tsx        # Main App component
│   └── main.tsx       # React entry point
├── Instructions/      # Project documentation
└── package.json       # Dependencies and scripts
```

## Development

### Adding New Features

1. Create components in `src/components/`
2. Add Redux slices in `src/store/`
3. Style with SCSS in `src/styles/`
4. Update Electron main process if needed

### Database

The app uses SQLite for local data storage. Database files are stored in the user's app data directory.

### Building for Distribution

```bash
# Build for current platform
npm run electron:build

# Build for specific platform
npm run electron:build -- --win
npm run electron:build -- --linux
npm run electron:build -- --mac
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support and questions, please open an issue in the repository. 
