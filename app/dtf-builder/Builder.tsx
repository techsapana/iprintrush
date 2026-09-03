"use client";
import { useState, useRef, useEffect } from "react";
import { renderPrintPNG } from "@/lib/builder/print-png";
import {
  SHOP_ORIGINS,
  isShopConnect,
  sendPNGToShop,
  type ShopConnection,
  QUALITY_STATEMENT,
} from "@/lib/builder/upload-bridge";
import {
  Upload,
  Plus,
  Minus,
  Copy,
  RotateCw,
  Trash2,
  WandSparkles,
  Download,
  ArrowUpRight,
  Check,
  AlertTriangle,
  Layers,
  Undo2,
  Move,
  X,
} from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
type Art = {
  id: string;
  name: string;
  src: string;
  pw: number;
  ph: number;
  x: number;
  y: number;
  w: number;
  h: number;
  rot: boolean;
  rotation?: number;
  sourceKind?: string;
  reviewRequired?: boolean;
};
const SHEET_LENGTHS = Array.from({ length: 118 }, (_, i) => i + 3);
const uid = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};
const round = (n: number) => Math.round(n * 100) / 100;
const rotationOf = (a: Art) => a.rotation ?? (a.rot ? 90 : 0);
const rotatedArtwork = (a: Art) => {
  const rotation = (rotationOf(a) + 90) % 360;
  return { ...a, rotation, rot: rotation % 180 !== 0 };
};
const imageTransform = (a: Art, scale: number) => {
  const rotation = rotationOf(a);
  return rotation === 90
    ? `translate(${a.h * scale}px,0) rotate(90deg)`
    : rotation === 180
      ? `translate(${a.w * scale}px,${a.h * scale}px) rotate(180deg)`
      : rotation === 270
        ? `translate(0,${a.w * scale}px) rotate(270deg)`
        : undefined;
};
const effectiveDpi = (a: Art) => Math.min(a.pw / a.w, a.ph / a.h);
const meetsPrintResolution = (a: Art) =>
  Number.isFinite(effectiveDpi(a)) && effectiveDpi(a) >= 300 - 1e-6;
const bounds = (a: Art) => ({ w: a.rot ? a.h : a.w, h: a.rot ? a.w : a.h });
const overlap = (a: Art, b: Art) => {
  const A = bounds(a),
    B = bounds(b);
  return (
    a.x < b.x + B.w - 0.001 &&
    a.x + A.w > b.x + 0.001 &&
    a.y < b.y + B.h - 0.001 &&
    a.y + A.h > b.y + 0.001
  );
};
const sameArtworkSize = (a: Art, b: Art) =>
  a.src === b.src && Math.abs(a.w - b.w) < 1e-6 && Math.abs(a.h - b.h) < 1e-6;
const resizeDimensions = (
  a: Art,
  dx: number,
  dy: number,
  width: number,
  height: number,
) => {
  const b = bounds(a);
  const ratio = Math.max(
    Math.max(0.1 / b.w, 0.1 / b.h),
    Math.min(
      (width - a.x) / b.w,
      (height - a.y) / b.h,
      1 + (dx * b.w + dy * b.h) / (b.w * b.w + b.h * b.h),
    ),
  );
  return { w: a.w * ratio, h: a.h * ratio };
};
const planQuantity = (
  arts: Art[],
  current: Art,
  quantity: number,
  gap: number,
  width: number,
  height: number,
) => {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 200)
    throw new Error("Enter a quantity from 1 to 200.");
  const group = arts.filter((a) => sameArtworkSize(a, current)),
    others = arts.filter((a) => !sameArtworkSize(a, current));
  if (others.length + quantity > 200)
    throw new Error("Maximum 200 artwork pieces per sheet.");
  if (quantity === group.length) return arts;
  const ordered = [current, ...group.filter((a) => a.id !== current.id)];
  if (quantity < group.length) {
    const keep = new Set(ordered.slice(0, quantity).map((a) => a.id));
    return arts.filter((a) => !sameArtworkSize(a, current) || keep.has(a.id));
  }
  const next = [...arts];
  for (let i = group.length; i < quantity; i++)
    next.push({ ...current, id: uid() });
  let x = gap,
    y = gap,
    row = 0;
  const packed = [...next]
    .sort((a, b) => bounds(b).h - bounds(a).h)
    .map((a) => {
      const b = bounds(a);
      if (x + b.w > width - gap) {
        x = gap;
        y += row + gap;
        row = 0;
      }
      const placed = { ...a, x: round(x), y: round(y) };
      x += b.w + gap;
      row = Math.max(row, b.h);
      return placed;
    });
  if (
    packed.some(
      (a) =>
        a.x + bounds(a).w > width - gap || a.y + bounds(a).h > height - gap,
    )
  )
    throw new Error(
      "These copies do not fit. Choose a longer sheet, then apply the quantity again.",
    );
  return packed;
};
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
function ArtworkRow({
  art,
  count,
  active,
  onSelect,
  onQuantity,
  busy,
}: {
  art: Art;
  count: number;
  active: boolean;
  onSelect: () => void;
  onQuantity: (quantity: string) => void;
  busy: boolean;
}) {
  const [quantity, setQuantity] = useState(String(count));
  useEffect(() => setQuantity(String(count)), [count]);
  return (
    <div className={`art-row ${active ? "active" : ""}`}>
      <button className="art-select" onClick={onSelect}>
        <img src={art.src} alt="" />
        <span>
          <strong>{art.name}</strong>
          <small>
            {round(bounds(art).w)} × {round(bounds(art).h)} in ·{" "}
            {Math.floor(effectiveDpi(art) + 1e-6)} DPI
            {!meetsPrintResolution(art) ? " ⚠" : ""}
          </small>
        </span>
      </button>
      <div className="row-quantity">
        <label htmlFor={`qty-${art.id}`}>Quantity</label>
        <input
          id={`qty-${art.id}`}
          aria-label={`Quantity for ${art.name}`}
          type="number"
          min="1"
          max="200"
          step="1"
          value={quantity}
          disabled={busy}
          onChange={(e) => setQuantity(e.target.value)}
        />
        <button
          className="btn"
          disabled={busy}
          onClick={() => onQuantity(quantity)}
        >
          Apply
        </button>
      </div>
    </div>
  );
}
export default function Builder() {
  const [arts, setArts] = useState<Art[]>([]),
    [selected, setSelected] = useState(""),
    [length, setLength] = useState(24),
    [zoom, setZoom] = useState(1),
    [gap, setGap] = useState(0.25),
    [busy, setBusy] = useState(false),
    [history, setHistory] = useState<Art[][]>([]),
    [dark, setDark] = useState(false);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [shopConnection, setShopConnection] = useState<ShopConnection | null>(
      null,
    ),
    [sending, setSending] = useState(false);
  const [approval, setApproval] = useState<{
    arts: Art[];
    length: number;
    at: string;
  } | null>(null);
  const qualityApproved = approval?.arts === arts && approval.length === length;
  const pngCache = useRef<{ arts: Art[]; length: number; blob: Blob } | null>(
    null,
  );
  useEffect(() => {
    pngCache.current = null;
    setApproval(null);
  }, [arts, length]);
  useEffect(() => {
    if (window.parent === window) return;
    const receive = (e: MessageEvent) => {
      if (isShopConnect(e, window.parent))
        setShopConnection({ origin: e.origin, session: e.data.session });
    };
    window.addEventListener("message", receive);
    for (const origin of SHOP_ORIGINS)
      window.parent.postMessage({ type: "iprintrush:ready" }, origin);
    return () => window.removeEventListener("message", receive);
  }, []);
  const exportAbort = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null),
    restore = useRef<HTMLInputElement>(null),
    sheet = useRef<HTMLDivElement>(null),
    drag = useRef<{
      x: number;
      y: number;
      ax: number;
      ay: number;
      id: string;
      resize?: boolean;
      w?: number;
      h?: number;
    } | null>(null);
  const current = arts.find((a) => a.id === selected),
    scale = 22 * zoom,
    width = 23;
  const copyCount = current
    ? arts.filter((a) => sameArtworkSize(a, current)).length
    : 0;
  const [quantityDraft, setQuantityDraft] = useState("1");
  useEffect(() => {
    setQuantityDraft(String(copyCount || 1));
  }, [selected, copyCount]);
  const commit = (next: Art[]) => {
    setHistory((h) => [...h.slice(-19), arts]);
    setArts(next);
  };
  const update = (patch: Partial<Art>) =>
    commit(arts.map((a) => (a.id === selected ? { ...a, ...patch } : a)));
  const out = arts.filter((a) => {
    let b = bounds(a);
    return (
      a.x < 0 ||
      a.y < 0 ||
      a.x + b.w > width + 0.001 ||
      a.y + b.h > length + 0.001
    );
  });
  const collisions = arts.filter((a, i) =>
    arts.some((b, j) => j !== i && overlap(a, b)),
  );
  const low = arts.filter((a) => !meetsPrintResolution(a));
  const reviewCount = arts.filter((a) => a.reviewRequired).length;
  const needsApproval = low.length > 0 || reviewCount > 0;
  const used =
    (arts.reduce((s, a) => s + a.w * a.h, 0) / (width * length)) * 100;
  async function upload(files: FileList | null) {
    if (!files || busy) return;
    setBusy(true);
    const additions: Art[] = [];
    const notice = toast.loading("Opening artwork…");
    try {
      const { importArtwork } = await import("@/lib/builder/import-artwork");
      for (const file of Array.from(files)) {
        try {
          const imported = await importArtwork(file, (message) =>
            toast.loading(message, { id: notice }),
          );
          if (arts.length + additions.length + imported.length > 200) {
            toast.error("Maximum 200 artwork pieces per sheet.");
            continue;
          }
          for (const art of imported)
            additions.push({
              ...art,
              id: uid(),
              x: 0.25 + (additions.length % 5) * 0.3,
              y: 0.25 + (additions.length % 5) * 0.3,
              rot: false,
            });
        } catch (e) {
          toast.error(
            `${file.name}: ${e instanceof Error ? e.message : "Could not open this file."}`,
          );
        }
      }
      if (additions.length) {
        commit([...arts, ...additions]);
        setSelected(additions.at(-1)!.id);
        toast.success(
          `${additions.length} artwork(s) added. Review sizes and arrange your sheet.`,
        );
      }
    } catch {
      toast.error(
        "The importer could not load. Refresh the page and try again.",
      );
    } finally {
      toast.dismiss(notice);
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  function arrange() {
    let x = gap,
      y = gap,
      row = 0;
    const next = [...arts]
      .sort((a, b) => bounds(b).h - bounds(a).h)
      .map((a) => {
        const b = bounds(a);
        if (x + b.w > width - gap) {
          x = gap;
          y += row + gap;
          row = 0;
        }
        const n = { ...a, x: round(x), y: round(y) };
        x += b.w + gap;
        row = Math.max(row, b.h);
        return n;
      });
    if (
      next.some(
        (a) =>
          a.x + bounds(a).w > width - gap || a.y + bounds(a).h > length - gap,
      )
    ) {
      toast.error(
        "Not enough space. Choose a longer sheet or reduce artwork size.",
      );
      return;
    }
    commit(next);
    toast.success("Artwork arranged with equal spacing.");
  }
  function applyQuantity(target = current, draft = quantityDraft) {
    if (!target) return;
    try {
      const next = planQuantity(
        arts,
        target,
        Number(draft),
        gap,
        width,
        length,
      );
      if (next !== arts) {
        commit(next);
        toast.success(`${Number(draft)} copies of this artwork size.`);
      }
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not update quantity.",
      );
    }
  }
  function duplicate() {
    if (!current) return;
    const a = { ...current, id: uid(), x: current.x + 0.5, y: current.y + 0.5 };
    commit([...arts, a]);
    setSelected(a.id);
  }
  const canExport =
    arts.length > 0 &&
    !out.length &&
    !collisions.length &&
    (!needsApproval || qualityApproved) &&
    !busy;
  async function exportPNG(destination: "download" | "website" = "download") {
    if (!canExport) return;
    setBusy(true);
    setExportProgress(0);
    const controller = new AbortController();
    exportAbort.current = controller;
    try {
      let blob: Blob;
      if (
        pngCache.current?.arts === arts &&
        pngCache.current.length === length
      ) {
        blob = pngCache.current.blob;
        setExportProgress(100);
      } else {
        blob = await renderPrintPNG(
          arts,
          length,
          setExportProgress,
          controller.signal,
          qualityApproved,
        );
        pngCache.current = { arts, length, blob };
      }
      const name = `iprintrush-23x${length}in-300dpi.png`;
      if (destination === "website") {
        setSending(true);
        toast.loading("Uploading to website...", { id: "uploading" });
        const formData = new FormData();
        formData.append("file", blob, name);
        formData.append("folder", "gang-sheets");
        
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        
        if (data.success) {
          toast.success("Uploaded successfully! Redirecting...", { id: "uploading" });
          const urlParams = new URLSearchParams(window.location.search);
          const returnUrl = urlParams.get("returnUrl");
          if (returnUrl) {
            const absoluteUrl = data.url.startsWith('http') ? data.url : window.location.origin + data.url;
            window.location.href = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}gs_url=${encodeURIComponent(absoluteUrl)}&gs_size=${length}`;
          } else {
            toast.success("Your gang sheet has been uploaded successfully! You can now close this window.");
          }
        } else {
          toast.error("Upload failed: " + (data.error || "Unknown error"), { id: "uploading" });
        }
        setSending(false);
      } else {
        download(blob, name);
        toast.success(
          `PNG ready: 23 × ${length} inches at 300 DPI. Verify that size in your RIP.`,
        );
      }
    } catch (e) {
      if (controller.signal.aborted)
        toast.info(
          "Cancelled. If upload had started, check the website before retrying.",
        );
      else
        toast.error(
          e instanceof Error
            ? e.message
            : "PNG export failed. Try a desktop browser with more available memory.",
        );
    } finally {
      setBusy(false);
      setExportProgress(null);
      setSending(false);
      exportAbort.current = null;
    }
  }
  async function loadProject(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 80e6) throw Error();
      const d = JSON.parse(await file.text());
      if (
        d.version !== 1 ||
        !SHEET_LENGTHS.includes(d.length) ||
        !Array.isArray(d.arts) ||
        d.arts.length > 200
      )
        throw Error();
      for (const a of d.arts) {
        if (
          typeof a.name !== "string" ||
          typeof a.src !== "string" ||
          !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(a.src) ||
          !["x", "y", "w", "h", "pw", "ph"].every((k) =>
            Number.isFinite(a[k]),
          ) ||
          a.w <= 0 ||
          a.h <= 0 ||
          a.pw <= 0 ||
          a.ph <= 0 ||
          typeof a.rot !== "boolean" ||
          (a.rotation !== undefined &&
            (![0, 90, 180, 270].includes(a.rotation) ||
              a.rot !== (a.rotation % 180 !== 0)))
        )
          throw Error();
      }
      const dimensions = new Map<string, { pw: number; ph: number }>();
      for (const a of d.arts) {
        let actual = dimensions.get(a.src);
        if (!actual) {
          actual = await new Promise<{ pw: number; ph: number }>(
            (resolve, reject) => {
              const img = new Image();
              img.onload = () => {
                const pw = img.naturalWidth,
                  ph = img.naturalHeight;
                img.src = "";
                if (!pw || !ph || pw * ph > 40e6)
                  reject(new Error("Invalid source dimensions"));
                else resolve({ pw, ph });
              };
              img.onerror = reject;
              img.src = a.src;
            },
          );
          dimensions.set(a.src, actual);
        }
        a.pw = actual.pw;
        a.ph = actual.ph;
      }
      commit(d.arts.map((a: Art) => ({ ...a, id: uid() })));
      setLength(d.length);
      setSelected("");
      toast.success("Project restored.");
    } catch {
      toast.error("This is not a valid saved builder project.");
    }
    if (restore.current) restore.current.value = "";
  }
  return (
    <div className="w-full pb-8">
      <section className="titlebar">
        <div>
          <div className="eyebrow">
            <span /> YOUR ARTWORK. YOUR LAYOUT.
          </div>
          <h1>Make room for every idea.</h1>
          <p>
            Build your sheet at actual print size. We’ll take it from there.
          </p>
        </div>
        <div className="project-actions">
          <button className="btn" onClick={() => restore.current?.click()}>
            Open project
          </button>
          <button
            className="btn"
            disabled={!arts.length}
            onClick={() =>
              download(
                new Blob([JSON.stringify({ version: 1, length, arts })], {
                  type: "application/json",
                }),
                "iprintrush-gangsheet.json",
              )
            }
          >
            Save project <Download size={15} />
          </button>
        </div>
      </section>
      <main className="workspace">
        <aside className="left-panel">
          <div className="panel-heading">
            <span className="step">01</span>
            <h2>Your artwork</h2>
            <span className="count">{arts.length}</span>
          </div>
          <input
            ref={input}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/tiff,application/pdf,.tif,.tiff,.pdf"
            hidden
            onChange={(e) => upload(e.target.files)}
          />
          <input
            ref={restore}
            type="file"
            accept=".json"
            hidden
            onChange={(e) => loadProject(e.target.files?.[0])}
          />
          <button
            className="upload-box"
            disabled={busy}
            onClick={() => input.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              upload(e.dataTransfer.files);
            }}
          >
            <span className="upload-icon">
              <Upload size={24} />
            </span>
            <strong>{busy ? "Working…" : "Upload artwork"}</strong>
            <span>or drop your files here</span>
            <small>PNG, JPG, WebP, TIFF, PDF · 20 MB each</small>
          </button>
          <div className="tip">
            <Check size={16} />
            <span>
              Transparent PNG works best.
              <br />
              Your image background will print.
            </span>
          </div>
          <div className="art-list">
            {arts.length === 0 ? (
              <div className="empty-library">
                <Layers size={25} />
                <p>Your artwork lives here</p>
                <span>
                  Add logos, designs, or graphics
                  <br />
                  to start building your sheet.
                </span>
              </div>
            ) : (
              arts
                .filter(
                  (a, i) => arts.findIndex((b) => sameArtworkSize(a, b)) === i,
                )
                .map((a) => (
                  <ArtworkRow
                    key={a.id}
                    art={a}
                    count={arts.filter((b) => sameArtworkSize(a, b)).length}
                    active={!!current && sameArtworkSize(a, current)}
                    onSelect={() => setSelected(a.id)}
                    onQuantity={(quantity) => applyQuantity(a, quantity)}
                    busy={busy}
                  />
                ))
            )}
          </div>
          <div className="left-bottom">
            <strong>A little prep goes a long way.</strong>
            <p>
              Use crisp artwork at 300 DPI. Check spelling, transparency, and
              final dimensions before printing.
            </p>
          </div>
        </aside>
        <section className="canvas-panel">
          <div className="toolbar">
            <div className="tool-group">
              <button
                title="Undo artwork change"
                aria-label="Undo artwork change"
                disabled={!history.length}
                onClick={() => {
                  setArts(history.at(-1)!);
                  setHistory(history.slice(0, -1));
                }}
              >
                <Undo2 size={18} />
              </button>
              <div className="tool-line" />
              <button
                title="Duplicate"
                aria-label="Duplicate"
                disabled={!current}
                onClick={duplicate}
              >
                <Copy size={18} />
              </button>
              <button
                title="Rotate 90 degrees"
                aria-label="Rotate 90 degrees"
                disabled={!current}
                onClick={() => current && update(rotatedArtwork(current))}
              >
                <RotateCw size={18} />
              </button>
              <button
                title="Delete selected"
                aria-label="Delete selected"
                disabled={!current}
                onClick={() => {
                  commit(arts.filter((a) => a.id !== selected));
                  setSelected("");
                }}
              >
                <Trash2 size={18} />
              </button>
            </div>
            <button
              className="auto-btn"
              disabled={!arts.length}
              onClick={arrange}
            >
              <WandSparkles size={16} /> Auto-arrange
            </button>
          </div>
          <div
            className="canvas-scroll"
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) setSelected("");
            }}
          >
            <div className="sheet-wrap" style={{ width: width * scale + 28 }}>
              <div className="top-ruler" style={{ width: width * scale }}>
                {Array.from({ length: 24 }, (_, i) => (
                  <span key={i} style={{ left: i * scale }}>
                    {i}
                  </span>
                ))}
              </div>
              <div className="vertical-ruler">
                {Array.from({ length: Math.floor(length / 2) + 1 }, (_, i) => (
                  <span key={i} style={{ top: i * 2 * scale }}>
                    {i * 2}
                  </span>
                ))}
              </div>
              <div
                ref={sheet}
                className={`sheet ${dark ? "dark-sheet" : ""}`}
                style={{ width: width * scale, height: length * scale }}
                onPointerDown={(e) => {
                  if (e.target === e.currentTarget) setSelected("");
                }}
              >
                {arts.length === 0 && (
                  <div
                    className={`sheet-empty ${length < 12 ? "short-sheet-empty" : ""}`}
                  >
                    <div className="empty-mark">
                      <Plus size={27} />
                    </div>
                    <strong>Your next great print starts here.</strong>
                    <p>
                      Upload artwork, set its size,
                      <br />
                      and make this sheet yours.
                    </p>
                    <button onClick={() => input.current?.click()}>
                      Add your first design <ArrowUpRight size={15} />
                    </button>
                  </div>
                )}
                {arts.map((a) => {
                  const b = bounds(a);
                  const invalid = out.includes(a) || collisions.includes(a);
                  return (
                    <div
                      key={a.id}
                      className={`placed ${a.id === selected ? "selected" : ""} ${invalid ? "invalid" : ""}`}
                      style={{
                        left: a.x * scale,
                        top: a.y * scale,
                        width: b.w * scale,
                        height: b.h * scale,
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`${a.name}, ${round(b.w)} by ${round(b.h)} inches. Arrow keys to move.`}
                      onFocus={() => setSelected(a.id)}
                      onKeyDown={(e) => {
                        let dx = 0,
                          dy = 0;
                        const n = e.shiftKey ? 0.5 : 0.05;
                        if (e.key === "ArrowLeft") dx = -n;
                        if (e.key === "ArrowRight") dx = n;
                        if (e.key === "ArrowUp") dy = -n;
                        if (e.key === "ArrowDown") dy = n;
                        if (dx || dy) {
                          e.preventDefault();
                          update({
                            x: round(
                              Math.max(0, Math.min(width - b.w, a.x + dx)),
                            ),
                            y: round(
                              Math.max(0, Math.min(length - b.h, a.y + dy)),
                            ),
                          });
                        }
                      }}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelected(a.id);
                        setHistory((h) => [...h.slice(-19), arts]);
                        drag.current = {
                          x: e.clientX,
                          y: e.clientY,
                          ax: a.x,
                          ay: a.y,
                          id: a.id,
                        };
                        e.currentTarget.setPointerCapture(e.pointerId);
                      }}
                      onPointerMove={(e) => {
                        const d = drag.current;
                        if (!d || d.id !== a.id) return;
                        if (d.resize && d.w && d.h) {
                          const size = resizeDimensions(
                            { ...a, w: d.w, h: d.h, x: d.ax, y: d.ay },
                            (e.clientX - d.x) / scale,
                            (e.clientY - d.y) / scale,
                            width,
                            length,
                          );
                          setArts((prev) =>
                            prev.map((p) =>
                              p.id === a.id ? { ...p, ...size } : p,
                            ),
                          );
                          return;
                        }
                        setArts((prev) =>
                          prev.map((p) =>
                            p.id === a.id
                              ? {
                                  ...p,
                                  x: round(
                                    Math.max(
                                      0,
                                      Math.min(
                                        Math.max(0, width - b.w),
                                        d.ax + (e.clientX - d.x) / scale,
                                      ),
                                    ),
                                  ),
                                  y: round(
                                    Math.max(
                                      0,
                                      Math.min(
                                        Math.max(0, length - b.h),
                                        d.ay + (e.clientY - d.y) / scale,
                                      ),
                                    ),
                                  ),
                                }
                              : p,
                          ),
                        );
                      }}
                      onPointerUp={() => (drag.current = null)}
                      onPointerCancel={() => (drag.current = null)}
                    >
                      <img
                        draggable={false}
                        alt={a.name}
                        src={a.src}
                        style={{
                          width: a.w * scale,
                          height: a.h * scale,
                          transform: imageTransform(a, scale),
                        }}
                      />
                      {a.id === selected && (
                        <>
                          <i className="corner tl" />
                          <i className="corner tr" />
                          <i className="corner bl" />
                          <button
                            type="button"
                            className="corner br resize-handle"
                            title="Drag to resize proportionally"
                            aria-label="Resize artwork; drag this corner or use Width and Height fields"
                            onPointerDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setHistory((h) => [...h.slice(-19), arts]);
                              drag.current = {
                                x: e.clientX,
                                y: e.clientY,
                                ax: a.x,
                                ay: a.y,
                                id: a.id,
                                resize: true,
                                w: a.w,
                                h: a.h,
                              };
                              e.currentTarget.setPointerCapture(e.pointerId);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="size-tag">
                            {round(b.w)} × {round(b.h)} in
                          </span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="sheet-caption">
                23″ × {length}″ <span>Transparent print area</span>
              </div>
            </div>
          </div>
          <div className="canvas-footer">
            <span>
              <Move size={14} /> Drag to move · corner to resize
            </span>
            <div className="zoom">
              <button
                aria-label="Zoom out"
                onClick={() => setZoom((z) => Math.max(0.4, round(z - 0.2)))}
              >
                <Minus size={15} />
              </button>
              <span>{Math.round(zoom * 100)}%</span>
              <button
                aria-label="Zoom in"
                onClick={() => setZoom((z) => Math.min(2, round(z + 0.2)))}
              >
                <Plus size={15} />
              </button>
            </div>
          </div>
        </section>
        <aside className="right-panel">
          <div className="panel-heading">
            <span className="step">02</span>
            <h2>Sheet setup</h2>
          </div>
          <label className="field-label">Sheet size</label>
          <Select
            value={String(length)}
            onValueChange={(v) => setLength(Number(v))}
          >
            <SelectTrigger className="size-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SHEET_LENGTHS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  23″ × {n}″
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="spec-row">
            <span>Print width</span>
            <strong>23 inches</strong>
          </div>
          <label className="field-label" htmlFor="gap">
            Auto-arrange spacing
          </label>
          <div className="input-unit">
            <input
              id="gap"
              type="number"
              min="0"
              max="2"
              step=".05"
              value={gap}
              onChange={(e) =>
                setGap(Math.max(0, Math.min(2, Number(e.target.value))))
              }
            />
            <span>in</span>
          </div>
          <label className="field-label">Canvas preview</label>
          <div className="swatches">
            <button
              className={!dark ? "swatch selected-swatch" : "swatch"}
              aria-label="Light canvas"
              onClick={() => setDark(false)}
            >
              <span className="light-swatch" /> Light
            </button>
            <button
              className={dark ? "swatch selected-swatch" : "swatch"}
              aria-label="Dark canvas"
              onClick={() => setDark(true)}
            >
              <span className="dark-swatch" /> Dark
            </button>
          </div>
          <p className="micro">Preview color is never printed.</p>
          {current && (
            <div className="selection-settings">
              <div className="section-top">
                <h3>Selected artwork</h3>
                <button aria-label="Deselect" onClick={() => setSelected("")}>
                  <X size={15} />
                </button>
              </div>
              <p className="selected-name">{current.name}</p>
              <div className="two-fields">
                <label>
                  Width (in)
                  <input
                    type="number"
                    min=".1"
                    max="120"
                    step=".1"
                    value={round(bounds(current).w)}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (v > 0 && v <= 120) {
                        const ratio = v / bounds(current).w;
                        update({ w: current.w * ratio, h: current.h * ratio });
                      }
                    }}
                  />
                </label>
                <label>
                  Height (in)
                  <input
                    type="number"
                    min=".1"
                    max="120"
                    step=".1"
                    value={round(bounds(current).h)}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (v > 0 && v <= 120) {
                        const ratio = v / bounds(current).h;
                        update({ w: current.w * ratio, h: current.h * ratio });
                      }
                    }}
                  />
                </label>
              </div>
              <p className="micro">
                Drag the bottom-right corner or enter a size.
                <br />
                Proportions locked · {Math.floor(
                  effectiveDpi(current) + 1e-6,
                )}{" "}
                DPI at this size
                {current.sourceKind === "pdf"
                  ? " (PDF rendered at 300 DPI)"
                  : ""}
                <br />
                Maximum at 300 DPI:{" "}
                {Math.floor((current.rot ? current.ph : current.pw) / 3) / 100}″
                ×{" "}
                {Math.floor((current.rot ? current.pw : current.ph) / 3) / 100}″
              </p>
              {!meetsPrintResolution(current) && (
                <button
                  className="btn full"
                  onClick={() => {
                    const factor = Math.min(1, effectiveDpi(current) / 300);
                    update({ w: current.w * factor, h: current.h * factor });
                  }}
                >
                  Reduce size to meet 300 DPI
                </button>
              )}
              <div className="quantity-controls">
                <label htmlFor="artwork-quantity">
                  Quantity of this artwork &amp; size
                </label>
                <div>
                  <input
                    id="artwork-quantity"
                    type="number"
                    min="1"
                    max="200"
                    step="1"
                    value={quantityDraft}
                    onChange={(e) => setQuantityDraft(e.target.value)}
                  />
                  <button
                    className="btn"
                    disabled={busy}
                    onClick={() => applyQuantity()}
                  >
                    Apply
                  </button>
                </div>
                <p className="micro">Adding copies auto-arranges the sheet.</p>
              </div>
              <button
                className="btn full"
                onClick={() => update(rotatedArtwork(current))}
              >
                <RotateCw size={15} /> Rotate 90° · {rotationOf(current)}° now
              </button>
              <button className="btn full" onClick={duplicate}>
                <Copy size={15} /> Duplicate artwork
              </button>
            </div>
          )}
          <div className="summary">
            <h3>Your sheet at a glance</h3>
            <div className="spec-row">
              <span>Artwork pieces</span>
              <strong>{arts.length}</strong>
            </div>
            <div className="spec-row">
              <span>Area occupied</span>
              <strong>{Math.min(100, Math.round(used))}%</strong>
            </div>
            <div className="usage">
              <span style={{ width: Math.min(100, used) + "%" }} />
            </div>
            <p className="micro">Based on artwork bounding boxes.</p>
            <div
              className={
                out.length || collisions.length ? "status warning" : "status"
              }
            >
              {out.length || collisions.length ? (
                <AlertTriangle size={17} />
              ) : (
                <Check size={17} />
              )}
              <span>
                {out.length
                  ? `${out.length} artwork(s) outside the sheet`
                  : collisions.length
                    ? `${collisions.length} artwork(s) overlap`
                    : arts.length
                      ? "Layout fits your sheet"
                      : "Ready for your artwork"}
              </span>
            </div>
            {low.length > 0 && (
              <div className="status warning">
                <AlertTriangle size={17} />
                <span>
                  {low.length} artwork(s) below 300 DPI at print size. Print may
                  look blurry or pixelated. Reduce the print size, replace the
                  source, or approve printing as supplied below.
                  <button
                    className="btn full"
                    onClick={() => setSelected(low[0].id)}
                  >
                    Review low-resolution artwork
                  </button>
                </span>
              </div>
            )}
            {reviewCount > 0 && (
              <div className="status warning">
                <AlertTriangle size={17} />
                <span>
                  {reviewCount} converted PDF/TIFF artwork(s). Review all pages,
                  backgrounds and colors. PDF rendering does not improve
                  low-quality images inside the file.
                </span>
              </div>
            )}
            {needsApproval && (
              <div className="quality-approval">
                <Checkbox
                  id="quality-approval"
                  checked={qualityApproved}
                  disabled={busy}
                  onCheckedChange={(checked) =>
                    setApproval(
                      checked === true
                        ? { arts, length, at: new Date().toISOString() }
                        : null,
                    )
                  }
                />
                <label htmlFor="quality-approval">{QUALITY_STATEMENT}</label>
              </div>
            )}
          </div>
          <button
            className="primary"
            disabled={!canExport}
            onClick={() => exportPNG("download")}
          >
            <Download size={17} />
            {exportProgress !== null
              ? `Preparing PNG… ${exportProgress}%`
              : "Download PNG"}
          </button>
          <button
            className="btn full upload-to-site"
            disabled={!canExport}
            onClick={() => exportPNG("website")}
          >
            <Upload size={16} /> UPLOAD TO WEBSITE
          </button>
          <p className="micro" style={{ textAlign: "center" }}>
            {shopConnection
              ? "Connected to iPrintRush Image Upload."
              : "Direct upload requires the connected iPrintRush product page."}
          </p>
          {exportProgress !== null && (
            <div role="status" aria-live="polite" className="export-note">
              {sending
                ? "Waiting for the website to confirm your PNG…"
                : "Preparing your full sheet. Keep this page open."}
              <button
                className="btn full"
                onClick={() => exportAbort.current?.abort()}
              >
                Cancel
              </button>
            </div>
          )}
          <p className="export-note">
            One transparent PNG · 300 DPI · 23″ × {length}″<br />
            Correct print-size metadata included. Check dimensions in your RIP.
            Large files work best on a computer.
          </p>
          <div className="review-note">
            300 DPI does not fix blur or JPEG artifacts. Review the original
            artwork before production.
            <br />
            {shopConnection
              ? "After upload, continue your order on the website."
              : "Checkout is not connected in this preview."}
          </div>
        </aside>
      </main>
    </div>
  );
}
