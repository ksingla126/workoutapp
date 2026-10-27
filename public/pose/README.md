On-phone pose tracking for Form check.

- `vision_bundle.mjs` and `wasm/`: @mediapipe/tasks-vision 0.10.21 (Apache License 2.0, Google).
- `pose_landmarker_lite.task`: MediaPipe Pose Landmarker (lite, float16), Apache License 2.0.

They're served from here (not a CDN) and cached by the service worker in the background after the app
first loads, so form checks work offline and video never leaves the phone.
