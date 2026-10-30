"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasCamera, setHasCamera] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const startCamera = useCallback(async () => {
    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        queueMicrotask(() => {
          setHasCamera(false);
          setError("Camera API not available in this environment");
        });
        return;
      }

      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setHasCamera(true);
      setIsStreaming(true);
      setError(null);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch((e) => {
          console.warn("Video play interrupted/pending:", e);
        });
      }
    } catch (err: unknown) {
      console.warn("Camera stream access issue (falling back to simulation view):", err);
      setHasCamera(false);
      setIsStreaming(false);
      const isNotAllowed = (err instanceof DOMException && err.name === "NotAllowedError") || 
        (typeof err === "object" && err !== null && "name" in err && (err as { name: string }).name === "NotAllowedError");
      const message = err instanceof Error ? err.message : "Camera access denied";
      setError(isNotAllowed ? "Camera permission denied" : message);
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStream(null);
    setIsStreaming(false);
    setHasCamera(false);
  }, []);

  // Ensure video element gets stream if mounted after getUserMedia resolves
  useEffect(() => {
    if (videoRef.current && stream && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((e) => console.warn("Auto-attaching video stream:", e));
    }
  }, [stream]);

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current) return null;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return null;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
  }, []);

  const toggleFacingMode = useCallback(() => {
    setFacingMode((m) => (m === "environment" ? "user" : "environment"));
  }, []);

  useEffect(() => {
    let unmounted = false;
    const init = async () => {
      await Promise.resolve();
      if (!unmounted) {
        await startCamera();
      }
    };
    void init();
    return () => {
      unmounted = true;
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  return {
    videoRef,
    stream,
    hasCamera,
    isStreaming,
    error,
    startCamera,
    stopCamera,
    captureFrame,
    facingMode,
    toggleFacingMode
  };
}
