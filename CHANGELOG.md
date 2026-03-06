# Changelog

All notable changes to this project will be documented in this file.

The format is inspired by Keep a Changelog, and versions are tracked with git tags.

## [0.2.0] - 2026-03-06

### Added

- Electron desktop shell with embedded local runtime server.
- In-app KDB-X setup assistant with platform-specific onboarding and runtime auto-detection.
- Desktop packaging for macOS, Windows, Linux x64, and Linux arm64.
- GitHub Releases workflow for building and uploading desktop artifacts.
- GitHub-based auto-update plumbing in the packaged app.
- Release icon assets for packaged builds.

### Changed

- Switched `npm start` to launch the Electron desktop app.
- Bundled Monaco and p5 locally instead of loading them from CDNs.
- Updated the app UI to include desktop runtime setup and update status.

### Notes

- Windows runtime guidance currently assumes WSL-backed `q`.
- macOS notarization and Windows signing activate once repository secrets are configured.
