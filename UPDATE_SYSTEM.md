# QuickBallot Update System

## Overview

The QuickBallot Electron app includes an automatic update system that allows users to easily update to the latest version. The system works by checking for updates, downloading them, and installing them.

## How It Works

1. **Update Check**: The app periodically checks for updates by comparing the current version with the latest version information available in a JSON file hosted on GitHub.

2. **Update Download**: When an update is available, the user can download it directly from within the app.

3. **Update Installation**: After downloading, the user can install the update by clicking the install button, which will open the installer.

## Implementation Details

### Frontend (Home.tsx)

The frontend implementation includes:

- `checkUpdate()`: Checks for updates by sending the current version and platform to the main process
- `handleDownloadUpdate()`: Downloads the update file using the main process IPC handler
- `handleInstallUpdate()`: Opens the installer for the downloaded update file

### Backend (main.ts)

The backend implementation includes IPC handlers for:

- `check-for-update`: Fetches update information from a JSON URL and compares versions
- `download-update`: Downloads update files from a provided URL and saves them locally
- `open-installer`: Opens the installer file using the system's default application
- `save-update-file`: Saves update files to the downloads directory (alternative method)

## Configuration

### Update Metadata

The update system relies on a JSON file (`latest.json`) that contains information about the latest version:

```json
{
  "version": "1.0.0",
  "mac": "https://github.com/AkshayAnuOnline/quickballot/releases/download/v1.0.0/QuickBallot-1.0.0.dmg",
  "win": "https://github.com/AkshayAnuOnline/quickballot/releases/download/v1.0.0/QuickBallot-1.0.0.exe",
  "linux": "https://github.com/AkshayAnuOnline/quickballot/releases/download/v1.0.0/QuickBallot-1.0.0.AppImage"
}
```

### Constants

- `LATEST_JSON_URL`: The URL where the latest.json file is hosted
- `DOWNLOAD_DIR`: The directory where downloaded updates are saved

## GitHub Actions Integration

The GitHub Actions workflow automatically builds and publishes releases for all platforms:

- macOS (.dmg)
- Windows (.exe)
- Linux (.AppImage, .deb)

When a new version tag is pushed, the workflow:

1. Builds the app for all platforms
2. Publishes the releases to GitHub
3. Uploads the build artifacts

## Publishing New Updates

To publish a new update:

1. Update the version in `package.json`
2. Update the `CURRENT_VERSION` constant in `src/components/Home.tsx`
3. Create a new git tag with the version number (e.g., `v1.0.1`)
4. Push the tag to GitHub
5. The GitHub Actions workflow will automatically build and publish the release

## Testing Updates

To test the update system locally:

1. Start the app in development mode
2. Modify the `LATEST_JSON_URL` to point to a local JSON file
3. Create a local `latest.json` file with a higher version number
4. Verify that the update notification appears

## Troubleshooting

If the update system is not working:

1. Verify that the `LATEST_JSON_URL` is correct and accessible
2. Check that the GitHub Actions workflow is properly configured
3. Ensure that the `GH_TOKEN` secret is set in the repository settings
4. Verify that the publish configuration is correct in `package.json`
