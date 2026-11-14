"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Shell } from "@/components/shell";
import { Badge, Button, Card, Label } from "@/components/ui";
import type { ReactionResult, VisionStatus } from "@/lib/homelab";
import { apiErrorDetail, parseApiResponse } from "@/lib/parse-api-response";

const INTERVAL_MS = 600;

async function fetchVisionStatus(): Promise<VisionStatus> {
  try {
    const res = await fetch("/api/homelab/vision/status");
    return (await parseApiResponse(res)) as VisionStatus;
  } catch {
    return { vision: "down" };
  }
}

function canUseWebcam(): boolean {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

export default function ReactionsPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [live, setLive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<VisionStatus | null>(null);
  const [result, setResult] = useState<ReactionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const webcamOk = canUseWebcam();

  // Load the vision service status once on mount. The setState calls run in
  // promise callbacks, and are dropped if the page unmounts first.
  useEffect(() => {
    let active = true;
    fetchVisionStatus().then((data) => {
      if (active) setStatus(data);
    });
    return () => {
      active = false;
    };
  }, []);

  const inferFromBase64 = useCallback(async (image_b64: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/homelab/vision/reaction", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image_b64 }),
      });
      const data = (await parseApiResponse(res)) as Record<string, unknown>;
      if (!res.ok) throw new Error(apiErrorDetail(data, res, "Inference failed"));
      setResult(data as ReactionResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inference failed");
    } finally {
      setLoading(false);
    }
  }, []);

  async function startCamera() {
    setError(null);
    if (!webcamOk) {
      setError(
        "Webcam needs HTTPS or localhost. Over plain HTTP (e.g. Tailscale :3081) use “Upload photo” below, or open via https://localhost with an SSH tunnel.",
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices!.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setStreaming(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Camera permission denied or unavailable",
      );
    }
  }

  function stopCamera() {
    setLive(false);
    const video = videoRef.current;
    if (video?.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    }
    setStreaming(false);
  }

  const captureAndInfer = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    await inferFromBase64(canvas.toDataURL("image/jpeg", 0.85));
  }, [inferFromBase64]);

  async function onPhotoSelected(file: File | null) {
    if (!file) return;
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result;
      if (typeof data === "string") void inferFromBase64(data);
    };
    reader.readAsDataURL(file);
  }

  useEffect(() => {
    if (!live || !streaming) return;
    const id = setInterval(() => {
      void captureAndInfer();
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [live, streaming, captureAndInfer]);

  const visionOk = status?.vision === "ok";
  const topProbs = result?.probabilities
    ? Object.entries(result.probabilities)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    : [];

  return (
    <Shell
      title="Reactions"
      subtitle="Facial expression detection (FER2013 ResNet18) — not mind-reading"
    >
      {status && !visionOk ? (
        <Card className="mb-6 border-amber-900/50 bg-amber-950/30">
          <p className="text-sm text-amber-200">
            Reaction model service is down. On the GPU PC run{" "}
            <code className="rounded bg-zinc-900 px-1">
              .\scripts\start-reaction-serve-bg.ps1
            </code>{" "}
            then refresh.
          </p>
        </Card>
      ) : null}

      {!webcamOk ? (
        <Card className="mb-6 border-amber-900/50 bg-amber-950/30">
          <p className="text-sm text-amber-200">
            This page is open over <strong>HTTP</strong>, so the browser blocks webcam access.
            Use <strong>Upload photo</strong> below (works on HTTP), or open the UI on{" "}
            <code className="rounded bg-zinc-900 px-1">https://localhost:3081</code> via an SSH
            tunnel.
          </p>
        </Card>
      ) : null}

      {visionOk && status?.classes ? (
        <Card className="mb-6">
          <p className="text-sm text-zinc-400">
            Model: <span className="text-zinc-200">{status.classes.join(", ")}</span>
          </p>
          {status.checkpoint ? (
            <p className="mt-1 truncate text-xs text-zinc-500">{status.checkpoint}</p>
          ) : null}
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <Label>{webcamOk ? "Webcam" : "Photo"}</Label>
          <div className="relative overflow-hidden rounded-lg bg-zinc-900 ring-1 ring-zinc-800">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Upload preview" className="aspect-video w-full object-cover" />
            ) : (
              <video
                ref={videoRef}
                className="aspect-video w-full object-cover"
                playsInline
                muted
              />
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={(e) => void onPhotoSelected(e.target.files?.[0] ?? null)}
          />
          <div className="flex flex-wrap gap-2">
            {webcamOk && !streaming ? (
              <Button type="button" onClick={() => void startCamera()}>
                Start camera
              </Button>
            ) : null}
            {webcamOk && streaming ? (
              <>
                <Button
                  type="button"
                  variant={live ? "ghost" : "primary"}
                  onClick={() => setLive(!live)}
                  disabled={!visionOk}
                >
                  {live ? "Pause live" : "Live detect"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void captureAndInfer()}
                  disabled={loading || !visionOk}
                >
                  {loading ? "Analyzing…" : "Single frame"}
                </Button>
                <Button type="button" variant="ghost" onClick={stopCamera}>
                  Stop camera
                </Button>
              </>
            ) : null}
            <Button
              type="button"
              variant={webcamOk ? "ghost" : "primary"}
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || !visionOk}
            >
              {loading ? "Analyzing…" : "Upload photo"}
            </Button>
            {previewUrl ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  if (previewUrl) URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                }}
              >
                Clear photo
              </Button>
            ) : null}
          </div>
        </Card>

        <Card className="space-y-4">
          <Label>Detected expression</Label>
          {result ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-3xl font-semibold capitalize text-emerald-400">
                  {result.label ?? "—"}
                </span>
                <Badge tone={result.face_detected ? "ok" : "warn"}>
                  {result.reason.replace(/_/g, " ")}
                </Badge>
              </div>
              <p className="text-sm text-zinc-400">
                Confidence:{" "}
                <span className="font-mono text-zinc-200">
                  {(result.confidence * 100).toFixed(1)}%
                </span>
                {result.duration_ms ? (
                  <span className="text-zinc-500"> · {result.duration_ms} ms</span>
                ) : null}
              </p>
              {topProbs.length > 0 ? (
                <ul className="space-y-2">
                  {topProbs.map(([cls, p]) => (
                    <li key={cls}>
                      <div className="mb-1 flex justify-between text-xs text-zinc-400">
                        <span className="capitalize">{cls}</span>
                        <span>{(p * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-emerald-600 transition-all"
                          style={{ width: `${Math.min(100, p * 100)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-zinc-500">
              {webcamOk
                ? "Start the camera or upload a photo, then run detect."
                : "Upload a face photo to analyze (webcam needs HTTPS)."}
            </p>
          )}
          <p className="border-t border-zinc-800 pt-4 text-xs text-zinc-500">
            Shows a <strong className="font-medium text-zinc-400">detected expression</strong>,
            not what you feel. Low confidence → ambiguous (FER+ style threshold).
          </p>
        </Card>
      </div>

      {error ? (
        <Card className="mt-6 border-red-900/50 bg-red-950/20">
          <p className="text-sm text-red-200">{error}</p>
        </Card>
      ) : null}
    </Shell>
  );
}
