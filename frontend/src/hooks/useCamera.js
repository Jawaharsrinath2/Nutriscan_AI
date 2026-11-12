import { useCallback, useEffect, useRef, useState } from "react";

const JPEG_QUALITY = 0.85;

// Live webcam stream for the camera modal. `available` is false when the browser blocks or lacks a camera.
export function useCamera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState(true);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const openCamera = useCallback(async () => {
    setOpen(true);
    setAvailable(true);
    if (!navigator.mediaDevices?.getUserMedia) {
      setAvailable(false);
      return;
    }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      if (videoRef.current) videoRef.current.srcObject = streamRef.current;
    } catch {
      setAvailable(false);
    }
  }, []);

  const closeCamera = useCallback(() => {
    stop();
    setOpen(false);
  }, [stop]);

  // Resolves to a JPEG Blob, or null if no frame is available yet.
  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!streamRef.current || !video?.videoWidth) return Promise.resolve(null);
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
  }, []);

  useEffect(() => stop, [stop]);

  return { videoRef, open, available, openCamera, closeCamera, captureFrame };
}
