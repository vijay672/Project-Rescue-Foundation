# Project Rescue Foundation — Known Limitations & Operational Considerations

## 1. Browser Storage Eviction Policies
- Modern mobile browsers (especially Safari on iOS) may evict IndexedDB contents after 7 days of non-usage if the device experiences severe disk pressure, unless the user installs the app to their home screen or grants persistent storage permission (`navigator.storage.persist()`).
- **Mitigation**: The application includes explicit Persistent Storage prompts and telemetry in the **Storage Diagnostics** view.

## 2. Background Sync Execution on Mobile Browsers
- The Web Background Synchronization API is supported in Chromium-based browsers on Android, but is not natively supported by WebKit/Safari on iOS.
- **Mitigation**: The application implements deterministic foreground sync as the primary reliable baseline, polling when the network reconnects and upon user interaction.

## 3. Hardware GPS Accuracy in Remote Regions
- In mountainous terrain or dense rainforests, cellular triangulation is unavailable, and satellite lock may take up to 30–60 seconds.
- **Mitigation**: The app allows configurable exception handling with manual reason logging when GPS lock cannot be achieved within 15 seconds.

## 4. End-to-End Encryption vs. Server-Side KMS Encryption
- While all data in transit is encrypted using TLS 1.3 and at rest via AWS KMS (Customer Managed Keys), the browser IndexedDB storage operates within the device's sandbox. Devices in the field should enforce biometric hardware passcodes and remote wipe capabilities.
