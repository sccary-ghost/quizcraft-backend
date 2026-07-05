# Proctoring Documentation

QuizCraft includes an integrated Online Proctoring system designed to ensure academic integrity during computer-based testing. This system is modular and can be enabled or disabled on a per-test basis.

## 1. Capabilities

When proctoring is enabled for a test, the following monitoring features are activated:

### Tab/Window Focus Monitoring
The frontend application listens to browser `visibilitychange` and `blur` events. If the candidate switches tabs or minimizes the browser, a violation is recorded.

### Full-Screen Enforcement
Candidates are forced into full-screen mode to take the exam. Exiting full-screen triggers a violation warning.

### Copy/Paste Prevention
Keyboard shortcuts for Copy (Ctrl+C), Paste (Ctrl+V), and Context Menus (Right-Click) are intercepted and blocked within the CBT workspace to prevent content theft or external aid.

### Webcam & AI Face Detection (Optional)
If enabled, the system captures snapshots from the candidate's webcam at randomized intervals (e.g., every 30-60 seconds).
- **No Face Detected**: Flags if the candidate leaves the frame.
- **Multiple Faces**: Flags if another person enters the frame.
- **Face Mismatch**: Flags if the person does not match the registered candidate profile.

## 2. Violation Severity Levels

Violations are classified by severity to aid Administrators in reviewing logs:

- **LOW**: Minor infractions, e.g., brief loss of focus or mouse leaving the window area.
- **MEDIUM**: E.g., Exiting full-screen mode, right-click attempts.
- **HIGH**: Tab switching away from the exam, or webcam detecting multiple faces.
- **CRITICAL**: Complete loss of webcam feed, deliberate tampering with the DOM, or continuous high-severity violations.

## 3. Administrative Review

Admins can review proctoring logs in real-time or post-exam:
- Navigating to the candidate's attempt details reveals a timeline of all recorded violations.
- Admins have the authority to invalidate an attempt if the logs conclusively demonstrate cheating.

## 4. Privacy & Compliance

- Webcam snapshots are transmitted securely over HTTPS.
- Snapshots are retained only for the duration specified by the organization's data retention policy and are automatically purged.
- Candidates must grant explicit browser permission for webcam access before the test begins. If denied, they cannot start the proctored test.
