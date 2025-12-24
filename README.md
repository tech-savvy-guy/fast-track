# FastTrack Chrome Extension

## Overview

FastTrack is a Chrome extension that automates the completion of Udemy course lectures. It intelligently marks incomplete course content as completed with rate limiting to ensure smooth operation, making course navigation more convenient.

![fast-track-preview-image](./preview.png)

## Features

- **Automated Completion**: Automatically marks all incomplete course lectures as completed
- **Smart Filtering**: Only processes unchecked items, skipping already completed content
- **Progress Tracking**: Real-time progress bar showing completion status and percentage
- **Rate Limiting**: Includes a 1-second delay between completions to prevent server overload
- **Certificate Detection**: Automatically checks for course completion certificates
- **Error Handling**: Provides clear error messages if the course page isn't detected
- **Reset Functionality**: Easy reset option to restart the process if needed

## Installation

To install this extension, follow these steps:

1. Clone this repository to your local machine or download the ZIP file:
   ```bash
   git clone https://github.com/tech-savvy-guy/fast-track.git
   cd fast-track
   ```

2. Open Google Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" in the top right corner

4. Click on "Load unpacked" and select the `fast-track` directory

5. The FastTrack extension icon should now appear in your Chrome toolbar

## Usage

1. Navigate to a Udemy course page (make sure you're on the course curriculum page)

2. Click on the FastTrack extension icon in your Chrome browser toolbar

3. Review the status display showing:
   - **Delay**: 1s (rate limiting delay between completions)
   - **Status**: Current operation status (Ready/Running/Done/Error)

4. Click the "Start Completion" button to begin the automated process

5. Watch the progress bar as it tracks completion:
   - Progress percentage
   - Current item count
   - Status messages for each step

6. The extension will:
   - Open all course sections automatically
   - Identify incomplete lectures
   - Mark them as complete one by one
   - Check for course completion certificate availability

7. If needed, click "Reset" in the footer to restart the process

## License

This project is licensed under the [MIT License](LICENSE).

---

**Disclaimer:** This extension is not affiliated with or endorsed by Udemy. Use it responsibly and at your own discretion. This tool is intended for educational purposes and should be used in accordance with Udemy's terms of service.
