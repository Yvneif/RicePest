import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Camera,
  ImagePlus,
  RotateCcw,
  ScanLine,
  FlaskConical,
  CloudUpload,
  HelpCircle,
  BookOpen,
  AlertTriangle,
  Share2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "../components/ui/Button";
import { Card, Chip, ConfidenceRing, Spinner } from "../components/ui/Primitives";
import { TopBar } from "../components/layout/TopBar";
import { useCamera } from "../hooks/useCamera";
import { useOnline } from "../hooks/useOnline";
import { api, ApiError } from "../api/client";
import { enqueueScan } from "../lib/offlineQueue";
import {
  loadOnDeviceModel,
  onDeviceEnabledPref,
  predictOnDevice,
  setOnDeviceEnabledPref,
} from "../lib/onDeviceModel";
import { formatPercent } from "../lib/device";
import { checkPhotoQuality, qualityMessage } from "../lib/photoQuality";
import { shareScanResult } from "../lib/share";
import { Cpu } from "lucide-react";

const PEST_SLUGS = {
  "Green Leafhopper": "green-leafhopper",
  "Leaf Folders": "leaf-folders",
  "Rice Bug": "rice-bug",
  "Stem Borer": "stem-borer",
};

export function IdentifyPage() {
  const navigate = useNavigate();
  const online = useOnline();
  const camera = useCamera();
  const fileInputRef = useRef(null);

  const [mode, setMode] = useState("camera"); // camera | preview | analyzing | result
  const [previewUrl, setPreviewUrl] = useState(null);
  const [blob, setBlob] = useState(null);
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(0);
  const [onDevice, setOnDevice] = useState(onDeviceEnabledPref);
  const [modelLoading, setModelLoading] = useState(null); // 0..1
  const [quality, setQuality] = useState(null);

  const toggleOnDevice = async () => {
    const next = !onDevice;
    setOnDevice(next);
    setOnDeviceEnabledPref(next);
    if (next && !modelLoading) {
      setModelLoading(0);
      loadOnDeviceModel((p) => setModelLoading(p))
        .then(() => setModelLoading(1))
        .catch(() => {
          setModelLoading(null);
          toast.error("Could not download the on-device model.");
        });
    }
  };

  useEffect(() => {
    if (mode === "camera") camera.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Warn before identifying a photo that is clearly dark, bright, or blurry.
  useEffect(() => {
    if (mode !== "preview" || !blob) return;
    let cancelled = false;
    checkPhotoQuality(blob).then((q) => {
      if (!cancelled) setQuality(q);
    });
    return () => {
      cancelled = true;
    };
  }, [mode, blob]);

  const takePhoto = async () => {
    const shot = await camera.snap();
    if (!shot) return;
    camera.stop();
    setBlob(shot);
    setPreviewUrl(URL.createObjectURL(shot));
    setMode("preview");
  };

  const pickFromGallery = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    camera.stop();
    setBlob(file);
    setPreviewUrl(URL.createObjectURL(file));
    setMode("preview");
    e.target.value = "";
  };

  const retake = () => {
    setBlob(null);
    setPreviewUrl(null);
    setResult(null);
    setQuality(null);
    setMode("camera");
  };

  const handleShare = async () => {
    try {
      const outcome = await shareScanResult({
        label: result.label,
        confidence: result.confidence,
        imageUrl: result.imageUrl,
        blob,
      });
      if (outcome === "shared") toast.success("Result shared!");
      if (outcome === "copied") toast.success("Copied — paste it in Messenger or SMS.");
    } catch {
      toast.error("Could not share the result.");
    }
  };

  const identify = async () => {
    if (!blob) return;
    setMode("analyzing");
    setProgress(0.1);
    const tick = setInterval(() => setProgress((p) => Math.min(p + 0.06, 0.92)), 250);

    // Use the on-device model when explicitly enabled or when offline.
    if (onDevice) {
      try {
        setProgress(0.4);
        const data = await predictOnDevice(blob);
        clearInterval(tick);
        setProgress(1);
        setResult(data);
        setMode("result");
        if (!online) toast.info("Identified on-device — you are offline.");
        return;
      } catch {
        if (!online) {
          clearInterval(tick);
          await enqueueScan(blob, { queuedAt: new Date().toISOString() });
          toast.success("Saved offline", {
            description: "The on-device model isn't downloaded yet. Your scan will sync later.",
          });
          retake();
          return;
        }
        toast.error("On-device model not ready — falling back to the server.");
        setOnDevice(false);
        setOnDeviceEnabledPref(false);
      }
    }

    try {
      const data = await api.predict(blob, (p) => setProgress(p));
      clearInterval(tick);
      setProgress(1);
      setResult(data);
      setMode("result");
    } catch (err) {
      clearInterval(tick);
      if (!online || err instanceof TypeError) {
        // Network failure: try on-device inference, then queue for later sync.
        try {
          setProgress(0.5);
          const data = await predictOnDevice(blob);
          setProgress(1);
          setResult(data);
          setMode("result");
          toast.info("Identified on-device — you are offline.");
        } catch {
          await enqueueScan(blob, { queuedAt: new Date().toISOString() });
          toast.success("Saved offline", {
            description: "No connection right now — your scan will sync automatically.",
          });
          retake();
        }
      } else {
        const message = err instanceof ApiError ? err.message : "Something went wrong.";
        toast.error(message);
        setMode("preview");
      }
    }
  };

  const recognized = result && result.label !== "Unrecognized";

  return (
    <div className="pb-32 lg:pb-10">
      <TopBar title="Identify" />
      <div className="mx-auto w-full max-w-md px-4 lg:grid lg:max-w-6xl lg:grid-cols-[minmax(0,26rem),minmax(0,1fr)] lg:items-start lg:gap-10 lg:px-8">
        <AnimatePresence mode="wait">
          {mode === "camera" && (
            <motion.div
              key="camera"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="mt-4"
            >
              <div className="relative overflow-hidden rounded-[2rem] bg-stone-900 shadow-lift">
                <video
                  ref={camera.videoRef}
                  playsInline
                  muted
                  className="aspect-[3/4] w-full object-cover lg:aspect-video"
                />
                {camera.ready && (
                  <div className="pointer-events-none absolute inset-0">
                    <div className="absolute inset-6 rounded-3xl border-2 border-white/50" />
                    <div className="animate-scanline absolute inset-x-8 h-1 rounded-full bg-gradient-to-r from-transparent via-brand-300 to-transparent shadow-[0_0_20px_rgba(74,222,128,0.9)]" />
                  </div>
                )}
                {!camera.ready && (
                  <div className="absolute inset-0 grid place-items-center text-center text-stone-300">
                    <div className="flex flex-col items-center gap-2 px-8">
                      {camera.error ? (
                        <>
                          <HelpCircle className="h-8 w-8" />
                          <p className="text-sm">
                            Camera unavailable
                            {camera.error.name === "NotAllowedError" && " — permission denied"}. Use
                            the gallery button below instead.
                          </p>
                        </>
                      ) : (
                        <>
                          <Spinner />
                          <p className="text-sm">Starting camera…</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-5 flex items-center justify-center gap-6">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={pickFromGallery}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-press glass grid h-13 w-13 place-items-center rounded-2xl p-3 text-brand-800"
                  aria-label="Choose from gallery"
                >
                  <ImagePlus className="h-6 w-6" />
                </button>
                <button
                  onClick={takePhoto}
                  disabled={!camera.ready}
                  className="btn-press relative grid h-20 w-20 place-items-center rounded-full bg-brand-700 text-white shadow-lift disabled:opacity-40"
                  aria-label="Take photo"
                >
                  <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-500/40" />
                  <Camera className="h-8 w-8" />
                </button>
                <span className="grid h-13 w-13 place-items-center rounded-2xl p-3 opacity-0">
                  <ImagePlus className="h-6 w-6" />
                </span>
              </div>
              <p className="mt-4 text-center text-xs text-stone-500">
                Hold steady about 15–30 cm from the pest, in good light.
              </p>
              <div className="mt-3 flex justify-center">
                <button
                  onClick={toggleOnDevice}
                  className={`btn-press flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold ${
                    onDevice
                      ? "bg-brand-100 text-brand-800"
                      : "glass text-stone-500"
                  }`}
                >
                  <Cpu className="h-3.5 w-3.5" />
                  {modelLoading != null && modelLoading < 1
                    ? `Downloading on-device model… ${Math.round(modelLoading * 100)}%`
                    : `On-device AI ${onDevice ? "on" : "off"}`}
                </button>
              </div>
            </motion.div>
          )}

          {(mode === "preview" || mode === "analyzing") && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="mt-4"
            >
              <div className="relative overflow-hidden rounded-[2rem] shadow-lift">
                <img
                  src={previewUrl}
                  alt="Captured pest"
                  className="aspect-[3/4] w-full object-cover lg:aspect-video"
                />
                {mode === "analyzing" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-end gap-4 bg-ink/60 pb-8">
                    <div className="glass flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold text-white">
                      <Spinner className="h-4 w-4" />
                      Identifying pest…
                    </div>
                    <div className="h-1.5 w-2/3 overflow-hidden rounded-full bg-white/20">
                      <div
                        className="h-full rounded-full bg-brand-400 transition-all duration-300"
                        style={{ width: `${progress * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              {mode === "preview" && quality && !quality.ok && (
                <Card className="mt-4 border border-gold-400/50 bg-gold-400/10 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-gold-600" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">May problema sa litrato</p>
                      <p className="mt-0.5 text-sm text-stone-600">
                        {qualityMessage(quality.issues)}
                      </p>
                      <p className="mt-1 text-xs text-stone-400">
                        Pwede pa ring ituloy kung malinaw naman ang peste.
                      </p>
                    </div>
                  </div>
                </Card>
              )}
              {mode === "preview" && (
                <div className="mt-5 flex gap-3">
                  <Button variant="secondary" size="lg" className="flex-1" onClick={retake}>
                    <RotateCcw className="h-4.5 w-4.5" /> Retake
                  </Button>
                  <Button size="lg" className="flex-1" onClick={identify}>
                    <ScanLine className="h-5 w-5" /> Identify
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {mode === "result" && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="mt-4 space-y-4"
            >
              <Card className="p-6 text-center">
                <div className="mx-auto">
                  <ConfidenceRing
                    value={result.confidence}
                    label={recognized ? "confidence" : "match strength"}
                  />
                </div>
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="mt-4 font-display text-2xl font-bold"
                >
                  {recognized ? result.label : "Unrecognized"}
                </motion.h2>
                <p className="mt-1 text-sm text-stone-500">
                  {recognized
                    ? "Identified with the on-server model."
                    : "This doesn't look like one of the known rice pests. Try a closer, brighter photo."}
                </p>
                <div className="mt-4 space-y-2 text-left">
                  {result.top3.map((t, i) => (
                    <div key={t.label} className="flex items-center gap-3">
                      <span className="w-36 shrink-0 truncate text-xs font-medium text-stone-500">
                        {t.label}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-200/70">
                        <motion.div
                          className={`h-full rounded-full ${i === 0 ? "bg-brand-600" : "bg-stone-300"}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${t.prob * 100}%` }}
                          transition={{ duration: 0.7, delay: 0.4 + i * 0.12, ease: "easeOut" }}
                        />
                      </div>
                      <span className="w-12 shrink-0 text-right text-xs tabular-nums text-stone-400">
                        {formatPercent(t.prob)}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              {recognized && (
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => navigate("/recommend", { state: { pest: result.label } })}
                >
                  <FlaskConical className="h-5 w-5" /> Get treatment recommendation
                </Button>
              )}
              {recognized && (
                <Button variant="secondary" size="md" className="w-full" onClick={handleShare}>
                  <Share2 className="h-4 w-4" /> Share this result
                </Button>
              )}
              <div className="flex gap-3">
                <Button variant="secondary" size="md" className="flex-1" onClick={retake}>
                  <Camera className="h-4 w-4" /> Scan again
                </Button>
                <Link
                  to="/history"
                  className="btn-press inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-[15px] font-semibold text-stone-600 hover:bg-stone-200/60"
                >
                  <CloudUpload className="h-4 w-4" /> View history
                </Link>
              </div>
              {result.model?.version && (
                <p className="text-center text-[11px] text-stone-400">
                  model {result.model.version} · scan #{result.scanId}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <aside className="mt-4 hidden lg:col-start-2 lg:row-start-1 lg:mt-0 lg:block">
          {mode !== "result" && (
            <Card className="p-5">
              <h3 className="flex items-center gap-2 font-display font-bold">
                <ScanLine className="h-4 w-4 text-brand-600" /> How to get a good scan
              </h3>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-stone-600">
                <li>• Hold steady 15–30 cm from the pest.</li>
                <li>• Shoot in good light — avoid shadows over the leaf.</li>
                <li>• Keep the pest or its damage in the center of the frame.</li>
                <li>• No camera? Use the gallery button to upload a photo instead.</li>
              </ul>
            </Card>
          )}
          {mode === "result" && recognized && (
            <Card className="p-5">
              <h3 className="flex items-center gap-2 font-display font-bold">
                <BookOpen className="h-4 w-4 text-brand-600" /> Learn more
              </h3>
              <p className="mt-2 text-sm text-stone-600">
                See photos and damage signs of {result.label} in the Library — and share the
                result with someone who can help.
              </p>
              <Link
                to="/catalog"
                className="btn-press mt-3 inline-flex items-center gap-2 rounded-2xl bg-brand-100 px-4 py-2 text-sm font-semibold text-brand-800"
              >
                Open the Library <BookOpen className="h-4 w-4" />
              </Link>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
