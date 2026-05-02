"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Image as ImageIcon, Loader2, RefreshCw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useWizard, type CreativeCta } from "./wizard-store";

type MetaPage = { id: string; name: string; category?: string };
type MetaPixel = { id: string; name: string; lastFiredAt: string | null };

const CTA_OPTIONS: { v: CreativeCta; l: string }[] = [
  { v: "LEARN_MORE", l: "Learn More" },
  { v: "SHOP_NOW", l: "Shop Now" },
  { v: "SIGN_UP", l: "Sign Up" },
  { v: "SUBSCRIBE", l: "Subscribe" },
  { v: "DOWNLOAD", l: "Download" },
  { v: "GET_QUOTE", l: "Get Quote" },
  { v: "CONTACT_US", l: "Contact Us" },
  { v: "APPLY_NOW", l: "Apply Now" },
  { v: "ORDER_NOW", l: "Order Now" },
  { v: "BOOK_TRAVEL", l: "Book Now" },
];

// Objectives that REQUIRE a pixel for proper optimization. Without one,
// Meta either rejects the AdSet (#100, "promoted_object required") or
// silently degrades the optimization to a clicks/impressions proxy.
function pixelRequiredFor(objective: string): boolean {
  return objective === "SALES" || objective === "LEADS";
}

export function StepCreative() {
  const {
    objective,
    platforms,
    domain,
    creative,
    update,
    setStep,
  } = useWizard();

  const metaSelected = platforms.includes("META");
  const requiresPixel = pixelRequiredFor(objective);

  const [pages, setPages] = useState<MetaPage[]>([]);
  const [pixels, setPixels] = useState<MetaPixel[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [loadingPixels, setLoadingPixels] = useState(false);
  const [pagesError, setPagesError] = useState<{ msg: string; reconnect?: boolean } | null>(null);
  const [pixelsError, setPixelsError] = useState<{ msg: string; reconnect?: boolean } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function setCreative(patch: Partial<typeof creative>) {
    update({ creative: { ...creative, ...patch } });
  }

  async function loadPages() {
    setLoadingPages(true);
    setPagesError(null);
    try {
      const res = await fetch("/api/meta/pages");
      const json = (await res.json()) as { ok: boolean; pages?: MetaPage[]; error?: string; requiresReconnect?: boolean };
      if (!json.ok) {
        setPagesError({ msg: json.error ?? "Failed to load Pages", reconnect: json.requiresReconnect });
        return;
      }
      setPages(json.pages ?? []);
      // Pre-select the first page if nothing is set yet — operator can change.
      if (!creative.metaPageId && json.pages?.length) {
        setCreative({ metaPageId: json.pages[0].id, metaPageName: json.pages[0].name });
      }
    } catch (err) {
      setPagesError({ msg: err instanceof Error ? err.message : "network" });
    } finally {
      setLoadingPages(false);
    }
  }

  async function loadPixels() {
    setLoadingPixels(true);
    setPixelsError(null);
    try {
      const res = await fetch("/api/meta/pixels");
      const json = (await res.json()) as { ok: boolean; pixels?: MetaPixel[]; error?: string; requiresReconnect?: boolean };
      if (!json.ok) {
        setPixelsError({ msg: json.error ?? "Failed to load Pixels", reconnect: json.requiresReconnect });
        return;
      }
      setPixels(json.pixels ?? []);
      if (!creative.metaPixelId && json.pixels?.length) {
        setCreative({ metaPixelId: json.pixels[0].id, metaPixelName: json.pixels[0].name });
      }
    } catch (err) {
      setPixelsError({ msg: err instanceof Error ? err.message : "network" });
    } finally {
      setLoadingPixels(false);
    }
  }

  useEffect(() => {
    if (!metaSelected) return;
    loadPages();
    loadPixels();
    // Default landing URL to the brand's domain if operator hasn't typed one.
    if (!creative.landingUrl && domain) {
      const url = domain.startsWith("http") ? domain : `https://${domain}`;
      setCreative({ landingUrl: url });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metaSelected]);

  async function handleFile(file: File) {
    if (file.size > 30 * 1024 * 1024) {
      toast.error("Image too large — max 30 MB");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/meta/upload-image", { method: "POST", body: fd });
      const json = (await res.json()) as { ok: boolean; hash?: string; url?: string; filename?: string; error?: string };
      if (!json.ok || !json.hash) {
        toast.error(json.error ?? "Upload failed");
        return;
      }
      setCreative({
        imageHash: json.hash,
        imagePreviewUrl: json.url ?? "",
        imageFilename: json.filename ?? file.name,
      });
      toast.success("Image uploaded to Meta");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  // Validation — all required for Meta delivery
  const errors = (() => {
    const e: string[] = [];
    if (!metaSelected) return e; // Skip if Meta isn't selected
    if (!creative.metaPageId) e.push("Select a Facebook Page");
    if (!creative.landingUrl) e.push("Enter a landing URL");
    else if (!/^https?:\/\/.+/i.test(creative.landingUrl)) e.push("Landing URL must start with http(s)://");
    if (!creative.headline.trim()) e.push("Headline required");
    else if (creative.headline.length > 40) e.push("Headline must be 40 characters or fewer");
    if (!creative.primaryText.trim()) e.push("Primary text required");
    else if (creative.primaryText.length > 125) e.push("Primary text must be 125 characters or fewer");
    if (creative.description.length > 30) e.push("Description must be 30 characters or fewer");
    if (!creative.imageHash) e.push("Upload an ad image");
    if (requiresPixel && !creative.metaPixelId) {
      e.push(
        `Objective ${objective} requires a Meta Pixel for conversion optimization. Install a Pixel on your site or pick an existing one above.`,
      );
    }
    return e;
  })();

  const canContinue = errors.length === 0;

  // If Meta isn't in the platform set, this step is a no-op pass-through.
  if (!metaSelected) {
    return (
      <div>
        <span className="eyebrow">Step 06 · Creative</span>
        <h1 className="mt-3 display text-3xl md:text-4xl">No creative needed.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You haven&apos;t selected Meta as a platform, so no ad creative is required for this campaign.
          (Other platforms gate behind their own integrations.)
        </p>
        <div className="mt-10 flex items-center justify-between">
          <Button variant="ghost" onClick={() => setStep("forecast")}>
            <ArrowLeft /> Back
          </Button>
          <Button variant="secondary" onClick={() => setStep("launch")}>
            Continue <ArrowRight />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <span className="eyebrow">Step 06 · Creative</span>
      <h1 className="mt-3 display text-3xl md:text-4xl">The actual ad.</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Meta needs a Page, a destination, copy, and an image before a campaign can deliver. We&apos;ll
        create the AdSet, Creative, and Ad on your behalf — paused on Meta for review before you activate.
      </p>

      {/* PAGE PICKER */}
      <div className="mt-8 space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="page">Facebook Page</Label>
          <button
            type="button"
            onClick={loadPages}
            disabled={loadingPages}
            className="text-2xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${loadingPages ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
        {pagesError ? (
          <div className="rounded-md border border-coral-500/40 bg-coral-500/5 p-3 text-xs">
            <p className="text-coral-600">{pagesError.msg}</p>
            {pagesError.reconnect && (
              <a
                href="/dashboard/integrations"
                className="mt-1 inline-block underline text-coral-700"
              >
                Reconnect Meta →
              </a>
            )}
          </div>
        ) : loadingPages ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading Pages
          </div>
        ) : pages.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No Pages found. Make sure you have an admin/advertiser role on at least one Facebook Page,
            then reconnect Meta.
          </p>
        ) : (
          <select
            id="page"
            value={creative.metaPageId}
            onChange={(e) => {
              const p = pages.find((x) => x.id === e.target.value);
              setCreative({ metaPageId: e.target.value, metaPageName: p?.name ?? "" });
            }}
            className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Select a Page…</option>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.category ? ` · ${p.category}` : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* LANDING URL */}
      <div className="mt-6 space-y-1.5">
        <Label htmlFor="landing">Landing URL</Label>
        <Input
          id="landing"
          type="url"
          placeholder="https://yourbrand.com/campaign-page"
          value={creative.landingUrl}
          onChange={(e) => setCreative({ landingUrl: e.target.value })}
        />
        <p className="text-2xs text-muted-foreground">
          Where the click goes. UTM tags are recommended; we don&apos;t append them automatically.
        </p>
      </div>

      {/* COPY */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="headline">Headline ({creative.headline.length}/40)</Label>
          <Input
            id="headline"
            type="text"
            maxLength={40}
            placeholder="The main hook"
            value={creative.headline}
            onChange={(e) => setCreative({ headline: e.target.value })}
            aria-invalid={creative.headline.length > 40}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cta">Call to action</Label>
          <select
            id="cta"
            value={creative.cta}
            onChange={(e) => setCreative({ cta: e.target.value as CreativeCta })}
            className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {CTA_OPTIONS.map((c) => (
              <option key={c.v} value={c.v}>
                {c.l}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        <Label htmlFor="primary">Primary text ({creative.primaryText.length}/125)</Label>
        <textarea
          id="primary"
          maxLength={125}
          rows={3}
          placeholder="The body of the ad — what's in it for the reader?"
          value={creative.primaryText}
          onChange={(e) => setCreative({ primaryText: e.target.value })}
          aria-invalid={creative.primaryText.length > 125}
          className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      <div className="mt-4 space-y-1.5">
        <Label htmlFor="desc">Link description (optional, {creative.description.length}/30)</Label>
        <Input
          id="desc"
          type="text"
          maxLength={30}
          placeholder="Below the headline on some placements"
          value={creative.description}
          onChange={(e) => setCreative({ description: e.target.value })}
          aria-invalid={creative.description.length > 30}
        />
      </div>

      {/* IMAGE UPLOAD */}
      <div className="mt-6 space-y-1.5">
        <Label>Ad image</Label>
        <div className="rounded-md border border-dashed border-border bg-surface-1/40 p-5">
          {creative.imagePreviewUrl ? (
            <div className="flex items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={creative.imagePreviewUrl}
                alt="Ad preview"
                className="h-24 w-24 rounded-md object-cover border border-border"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground truncate">{creative.imageFilename}</p>
                <p className="mono text-2xs text-muted-foreground mt-1 truncate">hash: {creative.imageHash}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" /> Replace image
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-xs text-muted-foreground">
                JPEG / PNG / GIF / WEBP — recommended 1080×1080 or 1200×628. Max 30 MB.
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading to Meta
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" /> Choose image
                  </>
                )}
              </Button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          />
        </div>
      </div>

      {/* PIXEL PICKER */}
      <div className="mt-6 space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="pixel">
            Meta Pixel{requiresPixel ? " (required for " + objective + ")" : " (optional)"}
          </Label>
          <button
            type="button"
            onClick={loadPixels}
            disabled={loadingPixels}
            className="text-2xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${loadingPixels ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
        {pixelsError ? (
          <p className="text-xs text-coral-600">{pixelsError.msg}</p>
        ) : loadingPixels ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading Pixels
          </div>
        ) : pixels.length === 0 ? (
          <div className="text-xs text-muted-foreground">
            No Pixels installed on this ad account. {requiresPixel ? (
              <span className="text-coral-600">
                {" "}You must install a Pixel before launching {objective} campaigns —
                <a className="underline ml-1" href="https://www.facebook.com/business/help/952192354843755" target="_blank" rel="noreferrer">
                  install guide ↗
                </a>
              </span>
            ) : null}
          </div>
        ) : (
          <select
            id="pixel"
            value={creative.metaPixelId}
            onChange={(e) => {
              const px = pixels.find((x) => x.id === e.target.value);
              setCreative({ metaPixelId: e.target.value, metaPixelName: px?.name ?? "" });
            }}
            className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">{requiresPixel ? "Select a Pixel…" : "(no pixel)"}</option>
            {pixels.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.lastFiredAt ? ` · last fired ${new Date(p.lastFiredAt).toLocaleDateString()}` : " · never fired"}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* VALIDATION SUMMARY */}
      {errors.length > 0 && (
        <div className="mt-6 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
          <p className="text-xs font-medium text-amber-700">Before you continue:</p>
          <ul className="mt-1 list-disc list-inside text-xs text-amber-700/90 space-y-0.5">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-10 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep("forecast")}>
          <ArrowLeft /> Back
        </Button>
        <Button variant="secondary" disabled={!canContinue} onClick={() => setStep("launch")}>
          Continue <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
