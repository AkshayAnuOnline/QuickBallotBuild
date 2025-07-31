# QuickBallot Electron App - Developer Instructions

## Important Note About Version Display

The version displayed in the app's UI (window title and about modal) is now dynamically read from package.json. When you update the version in package.json and follow the release process, both the GitHub releases and the app's UI will show the correct version.

## Important Note About Asset Loading

Static assets like images should be loaded using relative paths (e.g., `./assets/filename.png`) rather than absolute paths to ensure they load correctly in both development and production environments.

## Important Note About Version Handling

The app version is now properly handled through the electronAPI, which reads the version from package.json in the main process and makes it available to the renderer process. This avoids using `require()` in the renderer process, which is not allowed in Electron's sandboxed environment.

## Important Note About Preload Scripts

Preload scripts in Electron should only use the modules that are available in the Electron environment. Direct imports of Node.js modules like `fs` and `path` should be avoided. Instead, use IPC (Inter-Process Communication) to handle file operations in the main process and communicate with the renderer process through the electronAPI.

## Release Process

### New Automated Release Process (Recommended)

1. **Update package.json locally** to the new version:
   ```bash
   npm version 1.0.XX-test --no-git-tag-version
   ```

2. **Commit and push this change** to the main branch:
   ```bash
   git add package.json
   git commit -m "Update version to 1.0.XX-test"
   git push origin main
   ```

3. **That's it!** The GitHub Actions workflow will automatically:
   - Detect the package.json update on the main branch
   - Extract the version from package.json
   - Create and push the corresponding tag (v1.0.XX-test)
   - Build and create the draft release with the correct version

### Important Notes

- **Do NOT manually create and push tags** - The workflow handles this automatically
- **Do NOT worry about timing issues** - The workflow runs after the package.json update is committed
- **Do NOT manually update package.json before tagging** - This was causing the "Version not changed" error

### Why This Process Works

1. The workflow triggers on `package.json` changes to the `main` branch, not on tag pushes
2. It reads the version directly from `package.json` rather than trying to extract it from a tag
3. It creates the tag automatically after confirming the version
4. The build jobs use the same version from `package.json`, ensuring consistency

## Troubleshooting

### If the workflow fails with "Version not changed" error

This means the workflow tried to update package.json to a version that already exists. To fix this:

1. Ensure you're following the new process (update package.json first, then push)
2. Check that the version in package.json matches what you expect
3. If needed, you can manually trigger the workflow from the GitHub Actions page

### If releases are still one version behind

This indicates the old workflow behavior. Make sure:
1. You're using the updated workflow that runs on main branch updates
2. You're updating package.json before creating releases
3. You're not manually creating tags

## Workflow Details

The GitHub Actions workflow (`.github/workflows/version-and-build.yml`) now:
- Triggers on pushes to main branch when package.json changes
- Automatically creates tags based on the version in package.json
- Builds for macOS, Windows, and Linux
- Creates draft releases that can be manually published

This eliminates the race condition that was causing version mismatches in previous versions of the workflow.
