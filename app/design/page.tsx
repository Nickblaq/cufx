// app/design/page.tsx
"use client";
// app/design/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { create } from "zustand";
import { temporal } from "zundo";
import { useStoreWithEqualityFn } from "zustand/traditional";
import type { TemporalState } from "zundo";
import * as z from "zod";

/* ---------------------------------- zod ---------------------------------- */

const ElementSchema = z.object({
  id: z.string(),
  type: z.enum(["text", "rect", "image", "barcode", "qrcode", "line"]),
  name: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  text: z.string().optional(),
  fontSize: z.number().optional(),
  fontWeight: z.number().optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  color: z.string().optional(),
  bg: z.string().optional(),
  border: z.string().optional(),
  borderWidth: z.number().optional(),
  radius: z.number().optional(),
  locked: z.boolean().optional(),
  barcodeValue: z.string().optional(),
  barcodeFormat: z.string().optional(),
});

const TemplateSchema = z.object({
  id: z.string(),
  label: z.string(),
  subtitle: z.string(),
  width: z.number().positive(),
  height: z.number().positive(),
  background: z.string(),
  elements: z.array(ElementSchema),
});

type DesignElement = z.infer<typeof ElementSchema>;
type Template = z.infer<typeof TemplateSchema>;

/* -------------------------------- templates ------------------------------- */

let _uid = 0;
const uid = () => `el-${++_uid}`;

const ID_CARD: Template = {
  id: "id",
  label: "ID Card",
  subtitle: "ID-1 · 85.6 × 54 mm",
  width: 640,
  height: 400,
  background: "#f2efe6",
  elements: [
    { id: "topband", type: "rect", name: "Header band", x: 0, y: 0, w: 640, h: 90, bg: "#1e2a44", locked: true },
    { id: "country", type: "text", name: "Country", x: 24, y: 20, w: 400, h: 26, text: "REPUBLIC OF SAMPLELAND", fontSize: 20, fontWeight: 700, color: "#ffffff" },
    { id: "doctitle", type: "text", name: "Doc title", x: 24, y: 50, w: 400, h: 20, text: "DRIVER'S LICENSE", fontSize: 13, fontWeight: 500, color: "#c9d2e3" },
    { id: "classbadge", type: "text", name: "Class badge", x: 520, y: 22, w: 96, h: 20, text: "CLASS C", fontSize: 12, fontWeight: 700, color: "#ffffff", align: "right" },
    { id: "numtop", type: "text", name: "License #", x: 520, y: 46, w: 96, h: 16, text: "S-123-456-789", fontSize: 10, color: "#c9d2e3", align: "right" },
    { id: "photo", type: "image", name: "Photo", x: 24, y: 118, w: 130, h: 170, bg: "#d6d2c4", border: "#c1bdae", borderWidth: 1, radius: 4 },
    { id: "nameLabel", type: "text", name: "Label · Name", x: 176, y: 122, w: 200, h: 12, text: "NAME", fontSize: 9, fontWeight: 600, color: "#6d6a60" },
    { id: "nameValue", type: "text", name: "Name", x: 176, y: 136, w: 260, h: 28, text: "DOE, JANE A.", fontSize: 22, fontWeight: 700, color: "#14171a" },
    { id: "dobLabel", type: "text", name: "Label · DOB", x: 176, y: 178, w: 120, h: 12, text: "DATE OF BIRTH", fontSize: 9, fontWeight: 600, color: "#6d6a60" },
    { id: "dobValue", type: "text", name: "DOB", x: 176, y: 192, w: 120, h: 18, text: "01 / 01 / 1990", fontSize: 13, color: "#14171a" },
    { id: "expLabel", type: "text", name: "Label · Expires", x: 316, y: 178, w: 120, h: 12, text: "EXPIRES", fontSize: 9, fontWeight: 600, color: "#6d6a60" },
    { id: "expValue", type: "text", name: "Expires", x: 316, y: 192, w: 120, h: 18, text: "01 / 01 / 2030", fontSize: 13, color: "#14171a" },
    { id: "addrLabel", type: "text", name: "Label · Address", x: 176, y: 226, w: 200, h: 12, text: "ADDRESS", fontSize: 9, fontWeight: 600, color: "#6d6a60" },
    { id: "addrValue", type: "text", name: "Address", x: 176, y: 240, w: 300, h: 44, text: "123 SAMPLE STREET\nSAMPLEVILLE, SL 00000", fontSize: 12, color: "#14171a" },
    { id: "barcode", type: "barcode", name: "Barcode", x: 176, y: 300, w: 340, h: 56, barcodeValue: "S123456789", barcodeFormat: "CODE128" },
    { id: "sigLine", type: "line", name: "Signature line", x: 24, y: 322, w: 130, h: 1, bg: "#14171a" },
    { id: "sigLabel", type: "text", name: "Label · Signature", x: 24, y: 328, w: 130, h: 12, text: "SIGNATURE", fontSize: 8, fontWeight: 600, color: "#6d6a60", align: "center" },
    { id: "footer", type: "text", name: "Footer", x: 24, y: 368, w: 592, h: 14, text: "Mockup only · not a real government-issued document", fontSize: 9, color: "#8a8b85", align: "center" },
  ],
};

const RECEIPT: Template = {
  id: "receipt",
  label: "Receipt",
  subtitle: "Thermal · 80 mm roll",
  width: 380,
  height: 720,
  background: "#ffffff",
  elements: [
    { id: "store", type: "text", name: "Store name", x: 24, y: 22, w: 332, h: 30, text: "CORNER MART", fontSize: 22, fontWeight: 700, color: "#14171a", align: "center" },
    { id: "addr", type: "text", name: "Address", x: 24, y: 56, w: 332, h: 14, text: "123 Sample St · Sampleville", fontSize: 11, color: "#5b6065", align: "center" },
    { id: "phone", type: "text", name: "Phone", x: 24, y: 72, w: 332, h: 14, text: "(555) 010-2345", fontSize: 11, color: "#5b6065", align: "center" },
    { id: "d1", type: "line", name: "Divider", x: 24, y: 98, w: 332, h: 1, bg: "#c9c9c4" },
    { id: "dt", type: "text", name: "Date / time", x: 24, y: 108, w: 332, h: 14, text: "2024-06-14    14:22:07", fontSize: 11, color: "#5b6065", align: "center" },
    { id: "hdr", type: "text", name: "Header row", x: 24, y: 130, w: 332, h: 14, text: "ITEM                     QTY      PRICE", fontSize: 11, fontWeight: 700, color: "#14171a" },
    { id: "d2", type: "line", name: "Divider", x: 24, y: 150, w: 332, h: 1, bg: "#c9c9c4" },
    { id: "items", type: "text", name: "Line items", x: 24, y: 160, w: 332, h: 170, text: "Cold Brew Coffee          1      $4.50\nBlueberry Muffin          2      $7.00\nSourdough Loaf            1      $6.25\nOrganic Eggs (12)         1      $5.99\nBananas · 1.2 lb          1      $1.44\nCheddar · 8 oz            1      $4.10", fontSize: 12, color: "#14171a" },
    { id: "d3", type: "line", name: "Divider", x: 24, y: 344, w: 332, h: 1, bg: "#c9c9c4" },
    { id: "sub", type: "text", name: "Subtotal", x: 24, y: 354, w: 332, h: 16, text: "SUBTOTAL                       $29.28", fontSize: 12, color: "#14171a" },
    { id: "tax", type: "text", name: "Tax", x: 24, y: 372, w: 332, h: 16, text: "TAX (8.875%)                    $2.60", fontSize: 12, color: "#14171a" },
    { id: "d4", type: "line", name: "Divider", x: 24, y: 396, w: 332, h: 1, bg: "#c9c9c4" },
    { id: "total", type: "text", name: "Total", x: 24, y: 406, w: 332, h: 22, text: "TOTAL                          $31.88", fontSize: 15, fontWeight: 700, color: "#14171a" },
    { id: "d5", type: "line", name: "Divider", x: 24, y: 438, w: 332, h: 1, bg: "#c9c9c4" },
    { id: "pay", type: "text", name: "Payment", x: 24, y: 448, w: 332, h: 14, text: "VISA ···· 4242         AUTH 018492", fontSize: 11, color: "#5b6065" },
    { id: "qr", type: "qrcode", name: "QR code", x: 130, y: 486, w: 120, h: 120 },
    { id: "foot", type: "text", name: "Footer", x: 24, y: 624, w: 332, h: 16, text: "THANK YOU — COME AGAIN", fontSize: 12, fontWeight: 600, color: "#14171a", align: "center" },
    { id: "footsub", type: "text", name: "Footer sub", x: 24, y: 644, w: 332, h: 14, text: "Return within 14 days with receipt", fontSize: 10, color: "#5b6065", align: "center" },
  ],
};

const TEMPLATES: Template[] = [ID_CARD, RECEIPT];

/* ---------------------------------- store --------------------------------- */

type StoreState = {
  templateId: string;
  elements: DesignElement[];
  selectedId: string | null;
  setTemplate: (id: string) => void;
  select: (id: string | null) => void;
  updateElement: (id: string, patch: Partial<DesignElement>) => void;
  addElement: (el: DesignElement) => void;
  removeElement: (id: string) => void;
  resetTemplate: () => void;
};

const useDesignStore = create<StoreState>()(
  temporal(
    (set, get) => ({
      templateId: "id",
      elements: ID_CARD.elements.map((e) elements: => ({ ...e })),
      s selectedId: null,

      set.eTemplate: (id) => {
        constlements.filter t = TEMPLATES.find((x) => x.id === id);
        if (!t) return;
        set({
          templateId: id,
          elements: t.elements.map((e) => ({ ...e })),
          selectedId: null,
        });
      },

      select: (id) => set({ selectedId: id }),

      updateElement: (id, patch) =>
        set((s) => ({
          elements: s.elements.map((el) => (el.id === id ? { ...el, ...patch } : el)),
        })),

      addElement: (el) => set((s) => ({ elements: [...s.elements, el], selectedId: el.id })),

      removeElement: (id) =>
        set((s) => ({
         ((el) => el.id !== id),
          selectedId: s.selectedId === id ? null : s.selectedId,
        })),

      resetTemplate: () => {
        const t = TEMPLATES.find((x) => x.id === get().templateId);
        if (!t) return;
        set({ elements: t.elements.map((e) => ({ ...e })), selectedId: null });
      },
    }),
    {
      limit: 100,
      equality: (a, b) => a.elements === b.elements,
    }
  )
);

/** Reactive hook for temporal (undo/redo) state. */
function useTemporalStore<T>(selector: (state: TemporalState<StoreState>) => T): T {
  return useStoreWithEqualityFn(useDesignStore.temporal, selector);
}

/* ---------------------------------- icons --------------------------------- */

type IconProps = { size?: number };
const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconBack({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M15 5 8 12l7 7" />
    </svg>
  );
}
function IconUndo({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M4 10a8 8 0 1 1 2.3 5.6" />
      <path d="M4 4v6h6" />
    </svg>
  );
}
function IconRedo({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M20 10a8 8 0 1 0-2.3 5.6" />
      <path d="M20 4v6h-6" />
    </svg>
  );
}
function IconChevronDown({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
function IconText({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M5 6h14M12 6v13" />
    </svg>
  );
}
function IconRect({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <rect x="4" y="6" width="16" height="12" rx="2" />
    </svg>
  );
}
function IconImage({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m3 17 5-5 4 4 3-3 6 6" />
    </svg>
  );
}
function IconBarcode({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M4 5v14M7 5v14M10 5v10M13 5v14M16 5v10M19 5v14" />
    </svg>
  );
}
function IconQr({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <rect x="4" y="4" width="6" height="6" />
      <rect x="14" y="4" width="6" height="6" />
      <rect x="4" y="14" width="6" height="6" />
      <path d="M14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" />
    </svg>
  );
}
function IconTrash({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    </svg>
  );
}
function IconReset({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M4 12a8 8 0 1 0 3-6.2" />
      <path d="M4 4v5h5" />
    </svg>
  );
}

/* --------------------------------- barcode ------------------------------- */

function BarcodeView({ value, format, w, h }: { value: string; format: string; w: number; h: number }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";
    try {
      // Dynamic import keeps jsbarcode out of the initial bundle.
      import("jsbarcode").then(({ default: JsBarcode }) => {
        JsBarcode(el, value || "000000", {
          format: format || "CODE128",
          width: 2,
          height: Math.max(20, h - 10),
          displayValue: false,
          margin: 0,
          background: "transparent",
        });
      });
    } catch {
      // Fallback: render a placeholder pattern if the library fails.
      el.innerHTML = `<rect width="${w}" height="${h}" fill="#e3e3df" />`;
    }
  }, [value, format, w, h]);

  return (
    <svg
      ref={ref}
      width="100%"
      height="100%"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ display: "block" }}
    />
  );
}

/* --------------------------------- qrcode -------------------------------- */

function QrView({ value, size }: { value: string; size: number }) {
  const [svg, setSvg] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    import("qrcode").then(({ default: QRCode }) => {
      QRCode.toString(value || "https://example.com", { type: "svg", margin: 1, width: size })
        .then((s: string) => {
          if (!cancelled) setSvg(s);
        })
        .catch(() => {
          if (!cancelled) setSvg("");
        });
    });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!svg) {
    return <div style={{ width: "100%", height: "100%", background: "#e3e3df", borderRadius: 4 }} />;
  }
  return (
    <div
      style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/* --------------------------------- element ------------------------------- */

function ElementView({
  el,
  selected,
  onPointerDown,
}: {
  el: DesignElement;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent, el: DesignElement) => void;
}) {
  const base: React.CSSProperties = {
    position: "absolute",
    left: el.x,
    top: el.y,
    width: el.w,
    height: el.h,
    cursor: el.locked ? "default" : "grab",
    outline: selected ? "1.5px solid #2f5fed" : "none",
    outlineOffset: selected ? 1 : 0,
    touchAction: "none",
    userSelect: "none",
  };

  const body = (() => {
    switch (el.type) {
      case "text":
        return (
          <div
            style={{
              width: "100%",
              height: "100%",
              color: el.color ?? "#14171a",
              fontSize: el.fontSize ?? 12,
              fontWeight: el.fontWeight ?? 400,
              textAlign: el.align ?? "left",
              lineHeight: 1.28,
              whiteSpace: "pre-wrap",
              fontFamily: "var(--font-sans), system-ui, sans-serif",
              overflow: "hidden",
            }}
          >
            {el.text}
          </div>
        );
      case "rect":
        return (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: el.bg ?? "#ffffff",
              border: el.border ? `${el.borderWidth ?? 1}px solid ${el.border}` : undefined,
              borderRadius: el.radius ?? 0,
            }}
          />
        );
      case "image":
        return (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: el.bg ?? "#d6d2c4",
              border: el.border ? `${el.borderWidth ?? 1}px solid ${el.border}` : undefined,
              borderRadius: el.radius ?? 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#6d6a60",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.08em",
            }}
          >
            PHOTO
          </div>
        );
      case "barcode":
        return <BarcodeView value={el.barcodeValue ?? "000000"} format={el.barcodeFormat ?? "CODE128"} w={el.w} h={el.h} />;
      case "qrcode":
        return <QrView value={el.text ?? "https://example.com"} size={el.w} />;
      case "line":
        return <div style={{ width: "100%", height: "100%", background: el.bg ?? "#14171a" }} />;
      default:
        return null;
    }
  })();

  return (
    <div style={base} onPointerDown={(e) => onPointerDown(e, el)}>
      {body}
      {selected && !el.locked && (
        <>
          <span className="hnd tl" />
          <span className="hnd tr" />
          <span className="hnd bl" />
          <span className="hnd br" />
        </>
      )}
    </div>
  );
}

/* -------------------------------- helpers -------------------------------- */

const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);

function useStageScale(naturalWidth: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const ro = new ResizeObserver(() => {
      setScale(Math.min(1, el.clientWidth / naturalWidth));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [naturalWidth]);
  return { ref, scale };
}

/* ---------------------------------- page --------------------------------- */

export default function DesignStudio() {
  const {
    templateId,
    elements,
    selectedId,
    setTemplate,
    select,
    updateElement,
    addElement,
    removeElement,
    resetTemplate,
  } = useDesignStore();

  const { undo, redo, pastStates, futureStates } = useTemporalStore((s) => ({
    undo: s.undo,
    redo: s.redo,
    pastStates: s.pastStates,
    futureStates: s.futureStates,
  }));

  const template = TEMPLATES.find((t) => t.id === templateId)!;
  const { ref: stageRef, scale } = useStageScale(template.width);

  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const selected = useMemo(
    () => elements.find((e) => e.id === selectedId) ?? null,
    [elements, selectedId]
  );

  const canUndo = pastStates.length > 0;
  const canRedo = futureStates.length > 0;

  /* ------------------------------- pointer -------------------------------- */

  function onElementPointerDown(e: React.PointerEvent, el: DesignElement) {
    if (el.locked) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { id: el.id, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y };
    select(el.id);
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / (scale || 1);
    const dy = (e.clientY - d.startY) / (scale || 1);
    const el = elements.find((x) => x.id === d.id);
    if (!el) return;
    updateElement(d.id, {
      x: clamp(Math.round(d.origX + dx), 0, template.width - el.w),
      y: clamp(Math.round(d.origY + dy), 0, template.height - el.h),
    });
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  /* ------------------------------- actions -------------------------------- */

  function handleAddElement(type: DesignElement["type"]) {
    const id = uid();
    const cx = Math.round(template.width / 2 - 90);
    const cy = Math.round(template.height / 2 - 20);
    let el: DesignElement;
    switch (type) {
      case "text":
        el = { id, type, name: "New text", x: cx, y: cy, w: 180, h: 24, text: "New text", fontSize: 14, color: "#14171a" };
        break;
      case "rect":
        el = { id, type, name: "New rectangle", x: cx, y: cy, w: 180, h: 90, bg: "#e3e3df", radius: 6 };
        break;
      case "image":
        el = { id, type, name: "New image", x: cx, y: cy, w: 120, h: 140, bg: "#d6d2c4", border: "#c1bdae", borderWidth: 1, radius: 4 };
        break;
      case "barcode":
        el = { id, type, name: "New barcode", x: cx, y: cy, w: 180, h: 56, barcodeValue: "000000", barcodeFormat: "CODE128" };
        break;
      case "qrcode":
        el = { id, type, name: "New QR", x: cx, y: cy, w: 110, h: 110, text: "https://example.com" };
        break;
      case "line":
        el = { id, type, name: "New line", x: cx, y: cy, w: 200, h: 1, bg: "#14171a" };
        break;
    }
    addElement(el);
  }

  function handleDelete() {
    if (!selectedId) return;
    removeElement(selectedId);
  }

  /* --------------------------------- render ------------------------------- */

  const docStyle: React.CSSProperties = {
    position: "relative",
    width: template.width,
    height: template.height,
    background: template.background,
    transform: `scale(${scale})`,
    transformOrigin: "top left",
    boxShadow: "0 8px 40px rgba(20,23,26,0.16)",
    borderRadius: 10,
    overflow: "hidden",
  };

  const stageStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    height: template.height * scale,
    padding: 0,
  };

  return (
    <div className="root" onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
      <header className="topbar">
        <button className="iconbtn" aria-label="Back">
          <IconBack />
        </button>
        <div className="title">
          <span className="titleMain">Design Studio</span>
          <span className="titleSub">
            {template.label.toLowerCase()} · {elements.length} layers
          </span>
        </div>
        <div className="histbtns">
          <button className="histbtn" onClick={() => undo()} disabled={!canUndo} aria-label="Undo">
            <IconUndo />
          </button>
          <button className="histbtn" onClick={() => redo()} disabled={!canRedo} aria-label="Redo">
            <IconRedo />
          </button>
        </div>
        <button className="exportbtn">Export</button>
      </header>

      <div className="metastrip">
        <span>
          {template.width} × {template.height} px &nbsp;|&nbsp; {template.subtitle.toLowerCase()} &nbsp;|&nbsp;{" "}
          {selected ? `selected · ${selected.name}` : "tap an element to edit"}
        </span>
      </div>

      <div className="segwrap">
        <div className="segment" role="tablist" aria-label="Template">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={templateId === t.id}
              className={`segbtn ${templateId === t.id ? "segActive" : ""}`}
              onClick={() => setTemplate(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="previewWrap">
        <div className="stageOuter">
          <div ref={stageRef} style={stageStyle}>
            <div style={docStyle} onClick={() => select(null)}>
              {elements.map((el) => (
                <ElementView
                  key={el.id}
                  el={el}
                  selected={el.id === selectedId}
                  onPointerDown={onElementPointerDown}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <nav className="rail" aria-label="Add elements">
        <button className="railbtn" onClick={() => handleAddElement("text")}>
          <IconText />
          <span>Text</span>
        </button>
        <button className="railbtn" onClick={() => handleAddElement("rect")}>
          <IconRect />
          <span>Rect</span>
        </button>
        <button className="railbtn" onClick={() => handleAddElement("image")}>
          <IconImage />
          <span>Image</span>
        </button>
        <button className="railbtn" onClick={() => handleAddElement("barcode")}>
          <IconBarcode />
          <span>Barcode</span>
        </button>
        <button className="railbtn" onClick={() => handleAddElement("qrcode")}>
          <IconQr />
          <span>QR</span>
        </button>
        <button className="railbtn" onClick={handleDelete} disabled={!selected || selected.locked}>
          <IconTrash />
          <span>Delete</span>
        </button>
        <button className="railbtn" onClick={resetTemplate}>
          <IconReset />
          <span>Reset</span>
        </button>
      </nav>

      {selected && (
        <div className="sheetOverlay" onClick={() => select(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheetHandle" />
            <div className="sheetHead">
              <span>{selected.name}</span>
              <button className="closebtn" onClick={() => select(null)} aria-label="Close">
                <IconChevronDown />
              </button>
            </div>

            <div className="sheetBody">
              <div className="fieldGroup">
                <div className="groupLabel">Position &amp; size</div>
                <div className="grid4">
                  <NumField label="X" value={selected.x} onChange={(v) => updateElement(selected.id, { x: v })} />
                  <NumField label="Y" value={selected.y} onChange={(v) => updateElement(selected.id, { y: v })} />
                  <NumField label="W" value={selected.w} onChange={(v) => updateElement(selected.id, { w: v })} />
                  <NumField label="H" value={selected.h} onChange={(v) => updateElement(selected.id, { h: v })} />
                </div>
              </div>

              {selected.type === "text" && (
                <div className="fieldGroup">
                  <div className="groupLabel">Text</div>
                  <textarea
                    rows={2}
                    value={selected.text ?? ""}
                    onChange={(e) => updateElement(selected.id, { text: e.target.value })}
                  />
                  <div className="row">
                    <span className="rowLabel">Size</span>
                    <span className="rowValue">{selected.fontSize ?? 12}px</span>
                  </div>
                  <input
                    type="range"
                    min={6}
                    max={48}
                    value={selected.fontSize ?? 12}
                    onChange={(e) => updateElement(selected.id, { fontSize: Number(e.target.value) })}
                  />
                  <div className="row">
                    <span className="rowLabel">Weight</span>
                  </div>
                  <div className="chipRow">
                    {[400, 500, 600, 700].map((w) => (
                      <button
                        key={w}
                        className={`preset ${(selected.fontWeight ?? 400) === w ? "presetActive" : ""}`}
                        onClick={() => updateElement(selected.id, { fontWeight: w })}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                  <div className="row">
                    <span className="rowLabel">Align</span>
                  </div>
                  <div className="chipRow">
                    {(["left", "center", "right"] as const).map((a) => (
                      <button
                        key={a}
                        className={`preset ${(selected.align ?? "left") === a ? "presetActive" : ""}`}
                        onClick={() => updateElement(selected.id, { align: a })}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                  <div className="row">
                    <span className="rowLabel">Color</span>
                    <span className="rowValue">{selected.color ?? "#14171a"}</span>
                  </div>
                  <input
                    type="color"
                    value={selected.color ?? "#14171a"}
                    onChange={(e) => updateElement(selected.id, { color: e.target.value })}
                  />
                </div>
              )}

              {(selected.type === "rect" || selected.type === "line") && (
                <div className="fieldGroup">
                  <div className="groupLabel">Fill</div>
                  <input
                    type="color"
                    value={selected.bg ?? "#e3e3df"}
                    onChange={(e) => updateElement(selected.id, { bg: e.target.value })}
                  />
                  {selected.type === "rect" && (
                    <>
                      <div className="row">
                        <span className="rowLabel">Corner radius</span>
                        <span className="rowValue">{selected.radius ?? 0}px</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={40}
                        value={selected.radius ?? 0}
                        onChange={(e) => updateElement(selected.id, { radius: Number(e.target.value) })}
                      />
                    </>
                  )}
                </div>
              )}

              {selected.type === "barcode" && (
                <div className="fieldGroup">
                  <div className="groupLabel">Barcode</div>
                  <div className="row">
                    <span className="rowLabel">Value</span>
                  </div>
                  <input
                    type="text"
                    value={selected.barcodeValue ?? ""}
                    onChange={(e) => updateElement(selected.id, { barcodeValue: e.target.value })}
                  />
                  <div className="row">
                    <span className="rowLabel">Format</span>
                  </div>
                  <select
                    value={selected.barcodeFormat ?? "CODE128"}
                    onChange={(e) => updateElement(selected.id, { barcodeFormat: e.target.value })}
                  >
                    {["CODE128", "CODE39", "EAN13", "UPC", "ITF14"].map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              )}

              {selected.type === "qrcode" && (
                <div className="fieldGroup">
                  <div className="groupLabel">QR content</div>
                  <input
                    type="text"
                    value={selected.text ?? ""}
                    onChange={(e) => updateElement(selected.id, { text: e.target.value })}
                  />
                </div>
              )}

              <button className="dangerBtn" onClick={handleDelete} disabled={selected.locked}>
                Delete element
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .topbar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 16px 8px;
        }
        .iconbtn {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--surface);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--ink);
          flex-shrink: 0;
        }
        .title {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .titleMain {
          font-size: 15px;
          font-weight: 600;
          line-height: 1.2;
        }
        .titleSub {
          font-size: 11.5px;
          color: var(--ink-soft);
          font-family: var(--font-mono), monospace;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .histbtns {
          display: flex;
          gap: 4px;
          flex-shrink: 0;
        }
        .histbtn {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--ink-soft);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .histbtn:disabled {
          opacity: 0.35;
        }
        .exportbtn {
          background: var(--accent);
          color: #fff;
          border: none;
          padding: 9px 18px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 600;
          font-family: var(--font-sans), sans-serif;
          flex-shrink: 0;
        }

        .metastrip {
          padding: 0 16px 12px;
          font-family: var(--font-mono), monospace;
          font-size: 11.5px;
          color: var(--render);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .segwrap {
          padding: 0 16px 14px;
        }
        .segment {
          display: flex;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 3px;
        }
        .segbtn {
          flex: 1;
          border: none;
          background: transparent;
          padding: 8px 0;
          font-size: 14px;
          font-weight: 500;
          color: var(--ink-soft);
          border-radius: 9px;
          font-family: var(--font-sans), sans-serif;
        }
        .segActive {
          background: var(--ink);
          color: #fff;
        }

        .previewWrap {
          padding: 0 16px;
        }
        .stageOuter {
          background: repeating-linear-gradient(
            45deg,
            #ececE7 0 8px,
            #f3f3ef 8px 16px
          );
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: 12px;
          overflow: hidden;
        }

        .rail {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding: 16px 16px 24px;
        }
        .railbtn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          min-width: 64px;
          padding: 10px 6px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--ink-soft);
          flex-shrink: 0;
        }
        .railbtn span {
          font-size: 11px;
          font-weight: 500;
        }
        .railbtn:disabled {
          opacity: 0.4;
        }

        .sheetOverlay {
          position: fixed;
          inset: 0;
          background: rgba(20, 23, 26, 0.28);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          z-index: 20;
        }
        .sheet {
          width: 100%;
          max-width: 560px;
          max-height: 82vh;
          overflow-y: auto;
          background: var(--surface);
          border-radius: 20px 20px 0 0;
          padding: 10px 18px 26px;
          border: 1px solid var(--border);
          border-bottom: none;
        }
        .sheetHandle {
          width: 36px;
          height: 4px;
          border-radius: 2px;
          background: var(--border);
          margin: 4px auto 12px;
        }
        .sheetHead {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 600;
          font-size: 15px;
          margin-bottom: 14px;
        }
        .closebtn {
          border: none;
          background: transparent;
          color: var(--ink-soft);
          padding: 4px;
        }
        .sheetBody {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .fieldGroup {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .groupLabel {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--ink-soft);
          font-weight: 600;
        }
        .grid4 {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
        }
        .row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          margin-top: 4px;
        }
        .rowLabel {
          color: var(--ink-soft);
        }
        .rowValue {
          font-family: var(--font-mono), monospace;
          font-size: 12px;
        }

        textarea,
        input[type="text"],
        input[type="number"],
        select {
          width: 100%;
          padding: 9px 12px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--bg);
          font-size: 13.5px;
          font-family: var(--font-sans), sans-serif;
          color: var(--ink);
          resize: vertical;
        }
        select {
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%235b6065' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>");
          background-repeat: no-repeat;
          background-position: right 12px center;
          padding-right: 34px;
        }
        input[type="range"] {
          -webkit-appearance: none;
          width: 100%;
          height: 4px;
          border-radius: 2px;
          background: var(--border);
          accent-color: var(--accent);
        }
        input[type="color"] {
          width: 100%;
          height: 34px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--bg);
          padding: 2px;
        }

        .chipRow {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .preset {
          border: 1px solid var(--border);
          background: var(--bg);
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-family: var(--font-mono), monospace;
          color: var(--ink);
        }
        .presetActive {
          background: var(--ink);
          color: #fff;
          border-color: var(--ink);
        }

        .dangerBtn {
          width: 100%;
          padding: 11px 16px;
          border-radius: 12px;
          background: #fdecea;
          color: #b3261e;
          border: 1px solid #f6c6c1;
          font-size: 13.5px;
          font-weight: 600;
          font-family: var(--font-sans), sans-serif;
        }
        .dangerBtn:disabled {
          opacity: 0.4;
        }
      `}</style>

      <style jsx global>{`
        .hnd {
          position: absolute;
          width: 8px;
          height: 8px;
          background: #ffffff;
          border: 1.5px solid var(--accent);
          border-radius: 2px;
          pointer-events: none;
        }
        .hnd.tl { top: -5px; left: -5px; }
        .hnd.tr { top: -5px; right: -5px; }
        .hnd.bl { bottom: -5px; left: -5px; }
        .hnd.br { bottom: -5px; right: -5px; }
      `}</style>
    </div>
  );
}

/* -------------------------------- num field ------------------------------ */

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="numField">
      <span className="numLabel">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
      <style jsx>{`
        .numField {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .numLabel {
          font-size: 10px;
          font-weight: 600;
          color: var(--ink-soft);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        input {
          width: 100%;
          padding: 7px 8px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--bg);
          font-size: 12.5px;
          font-family: var(--font-mono), monospace;
          color: var(--ink);
          text-align: center;
        }
      `}</style>
    </label>
  );
}
import { useEffect, useMemo, useRef, useState } from "react";

/* --------------------------------- icons --------------------------------- */

type IconProps = { size?: number };
const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconBack({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M15 5 8 12l7 7" />
    </svg>
  );
}
function IconChevronDown({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
function IconText({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M5 6h14M12 6v13" />
    </svg>
  );
}
function IconRect({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <rect x="4" y="6" width="16" height="12" rx="2" />
    </svg>
  );
}
function IconImage({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m3 17 5-5 4 4 3-3 6 6" />
    </svg>
  );
}
function IconBarcode({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M4 5v14M7 5v14M10 5v10M13 5v14M16 5v10M19 5v14" />
    </svg>
  );
}
function IconQr({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <rect x="4" y="4" width="6" height="6" />
      <rect x="14" y="4" width="6" height="6" />
      <rect x="4" y="14" width="6" height="6" />
      <path d="M14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" />
    </svg>
  );
}
function IconTrash({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    </svg>
  );
}
function IconReset({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M4 12a8 8 0 1 0 3-6.2" />
      <path d="M4 4v5h5" />
    </svg>
  );
}

/* --------------------------------- types --------------------------------- */

type ElementType = "text" | "rect" | "image" | "barcode" | "qrcode" | "line";

type DesignElement = {
  id: string;
  type: ElementType;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
  fontSize?: number;
  fontWeight?: number;
  align?: "left" | "center" | "right";
  color?: string;
  bg?: string;
  border?: string;
  borderWidth?: number;
  radius?: number;
  locked?: boolean;
};

type Template = {
  id: string;
  label: string;
  subtitle: string;
  width: number;
  height: number;
  background: string;
  elements: DesignElement[];
};

/* -------------------------------- templates ------------------------------- */

let _uid = 0;
const uid = () => `el-${++_uid}`;

const ID_CARD: Template = {
  id: "id",
  label: "ID Card",
  subtitle: "ID-1 · 85.6 × 54 mm",
  width: 640,
  height: 400,
  background: "#f2efe6",
  elements: [
    { id: "topband", type: "rect", name: "Header band", x: 0, y: 0, w: 640, h: 90, bg: "#1e2a44", locked: true },
    { id: "country", type: "text", name: "Country", x: 24, y: 20, w: 400, h: 26, text: "REPUBLIC OF SAMPLELAND", fontSize: 20, fontWeight: 700, color: "#ffffff" },
    { id: "doctitle", type: "text", name: "Doc title", x: 24, y: 50, w: 400, h: 20, text: "DRIVER'S LICENSE", fontSize: 13, fontWeight: 500, color: "#c9d2e3" },
    { id: "classbadge", type: "text", name: "Class badge", x: 520, y: 22, w: 96, h: 20, text: "CLASS C", fontSize: 12, fontWeight: 700, color: "#ffffff", align: "right" },
    { id: "numtop", type: "text", name: "License #", x: 520, y: 46, w: 96, h: 16, text: "S-123-456-789", fontSize: 10, color: "#c9d2e3", align: "right" },
    { id: "photo", type: "image", name: "Photo", x: 24, y: 118, w: 130, h: 170, bg: "#d6d2c4", border: "#c1bdae", borderWidth: 1, radius: 4 },
    { id: "nameLabel", type: "text", name: "Label · Name", x: 176, y: 122, w: 200, h: 12, text: "NAME", fontSize: 9, fontWeight: 600, color: "#6d6a60" },
    { id: "nameValue", type: "text", name: "Name", x: 176, y: 136, w: 260, h: 28, text: "DOE, JANE A.", fontSize: 22, fontWeight: 700, color: "#14171a" },
    { id: "dobLabel", type: "text", name: "Label · DOB", x: 176, y: 178, w: 120, h: 12, text: "DATE OF BIRTH", fontSize: 9, fontWeight: 600, color: "#6d6a60" },
    { id: "dobValue", type: "text", name: "DOB", x: 176, y: 192, w: 120, h: 18, text: "01 / 01 / 1990", fontSize: 13, color: "#14171a" },
    { id: "expLabel", type: "text", name: "Label · Expires", x: 316, y: 178, w: 120, h: 12, text: "EXPIRES", fontSize: 9, fontWeight: 600, color: "#6d6a60" },
    { id: "expValue", type: "text", name: "Expires", x: 316, y: 192, w: 120, h: 18, text: "01 / 01 / 2030", fontSize: 13, color: "#14171a" },
    { id: "addrLabel", type: "text", name: "Label · Address", x: 176, y: 226, w: 200, h: 12, text: "ADDRESS", fontSize: 9, fontWeight: 600, color: "#6d6a60" },
    { id: "addrValue", type: "text", name: "Address", x: 176, y: 240, w: 300, h: 44, text: "123 SAMPLE STREET\nSAMPLEVILLE, SL 00000", fontSize: 12, color: "#14171a" },
    { id: "barcode", type: "barcode", name: "Barcode", x: 176, y: 300, w: 340, h: 56 },
    { id: "sigLine", type: "line", name: "Signature line", x: 24, y: 322, w: 130, h: 1, bg: "#14171a" },
    { id: "sigLabel", type: "text", name: "Label · Signature", x: 24, y: 328, w: 130, h: 12, text: "SIGNATURE", fontSize: 8, fontWeight: 600, color: "#6d6a60", align: "center" },
    { id: "footer", type: "text", name: "Footer", x: 24, y: 368, w: 592, h: 14, text: "Mockup only · not a real government-issued document", fontSize: 9, color: "#8a8b85", align: "center" },
  ],
};

const RECEIPT: Template = {
  id: "receipt",
  label: "Receipt",
  subtitle: "Thermal · 80 mm roll",
  width: 380,
  height: 720,
  background: "#ffffff",
  elements: [
    { id: "store", type: "text", name: "Store name", x: 24, y: 22, w: 332, h: 30, text: "CORNER MART", fontSize: 22, fontWeight: 700, color: "#14171a", align: "center" },
    { id: "addr", type: "text", name: "Address", x: 24, y: 56, w: 332, h: 14, text: "123 Sample St · Sampleville", fontSize: 11, color: "#5b6065", align: "center" },
    { id: "phone", type: "text", name: "Phone", x: 24, y: 72, w: 332, h: 14, text: "(555) 010-2345", fontSize: 11, color: "#5b6065", align: "center" },
    { id: "d1", type: "line", name: "Divider", x: 24, y: 98, w: 332, h: 1, bg: "#c9c9c4" },
    { id: "dt", type: "text", name: "Date / time", x: 24, y: 108, w: 332, h: 14, text: "2024-06-14    14:22:07", fontSize: 11, color: "#5b6065", align: "center" },
    { id: "hdr", type: "text", name: "Header row", x: 24, y: 130, w: 332, h: 14, text: "ITEM                     QTY      PRICE", fontSize: 11, fontWeight: 700, color: "#14171a" },
    { id: "d2", type: "line", name: "Divider", x: 24, y: 150, w: 332, h: 1, bg: "#c9c9c4" },
    { id: "items", type: "text", name: "Line items", x: 24, y: 160, w: 332, h: 170, text: "Cold Brew Coffee          1      $4.50\nBlueberry Muffin          2      $7.00\nSourdough Loaf            1      $6.25\nOrganic Eggs (12)         1      $5.99\nBananas · 1.2 lb          1      $1.44\nCheddar · 8 oz            1      $4.10", fontSize: 12, color: "#14171a" },
    { id: "d3", type: "line", name: "Divider", x: 24, y: 344, w: 332, h: 1, bg: "#c9c9c4" },
    { id: "sub", type: "text", name: "Subtotal", x: 24, y: 354, w: 332, h: 16, text: "SUBTOTAL                       $29.28", fontSize: 12, color: "#14171a" },
    { id: "tax", type: "text", name: "Tax", x: 24, y: 372, w: 332, h: 16, text: "TAX (8.875%)                    $2.60", fontSize: 12, color: "#14171a" },
    { id: "d4", type: "line", name: "Divider", x: 24, y: 396, w: 332, h: 1, bg: "#c9c9c4" },
    { id: "total", type: "text", name: "Total", x: 24, y: 406, w: 332, h: 22, text: "TOTAL                          $31.88", fontSize: 15, fontWeight: 700, color: "#14171a" },
    { id: "d5", type: "line", name: "Divider", x: 24, y: 438, w: 332, h: 1, bg: "#c9c9c4" },
    { id: "pay", type: "text", name: "Payment", x: 24, y: 448, w: 332, h: 14, text: "VISA ···· 4242         AUTH 018492", fontSize: 11, color: "#5b6065" },
    { id: "qr", type: "qrcode", name: "QR code", x: 130, y: 486, w: 120, h: 120 },
    { id: "foot", type: "text", name: "Footer", x: 24, y: 624, w: 332, h: 16, text: "THANK YOU — COME AGAIN", fontSize: 12, fontWeight: 600, color: "#14171a", align: "center" },
    { id: "footsub", type: "text", name: "Footer sub", x: 24, y: 644, w: 332, h: 14, text: "Return within 14 days with receipt", fontSize: 10, color: "#5b6065", align: "center" },
  ],
};

const TEMPLATES: Template[] = [ID_CARD, RECEIPT];

/* -------------------------------- helpers -------------------------------- */

const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);

function useStageScale(naturalWidth: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      setScale(Math.min(1, w / naturalWidth));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [naturalWidth]);
  return { ref, scale };
}

/* --------------------------------- barcode ------------------------------- */

function Barcode({ w, h }: { w: number; h: number }) {
  const bars = useMemo(() => {
    const out: { x: number; bw: number }[] = [];
    let x = 0;
    let seed = 7;
    while (x < w - 3) {
      seed = (seed * 9301 + 49297) % 233280;
      const r = seed / 233280;
      const bw = 1 + Math.floor(r * 3);
      out.push({ x, bw });
      x += bw + 1 + Math.floor(((seed >> 3) % 3));
    }
    return out;
  }, [w]);
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.bw} height={h} fill="#14171a" />
      ))}
    </svg>
  );
}

function QrCode({ size }: { size: number }) {
  const grid = useMemo(() => {
    const n = 21;
    const g: boolean[][] = [];
    let seed = 42;
    for (let y = 0; y < n; y++) {
      const row: boolean[] = [];
      for (let x = 0; x < n; x++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        row.push(((seed >> 16) & 1) === 1);
      }
      g.push(row);
    }
    const finder = (ox: number, oy: number) => {
      for (let y = 0; y < 7; y++)
        for (let x = 0; x < 7; x++) {
          const on = y === 0 || y === 6 || x === 0 || x === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4);
          g[oy + y][ox + x] = on;
        }
    };
    finder(0, 0);
    finder(n - 7, 0);
    finder(0, n - 7);
    return g;
  }, []);
  const n = grid.length;
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges">
      <rect width={n} height={n} fill="#fff" />
      {grid.flatMap((row, y) =>
        row.map((on, x) =>
          on ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#14171a" /> : null
        )
      )}
    </svg>
  );
}

/* --------------------------------- element ------------------------------- */

function ElementView({
  el,
  selected,
  onPointerDown,
}: {
  el: DesignElement;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent, el: DesignElement) => void;
}) {
  const base: React.CSSProperties = {
    position: "absolute",
    left: el.x,
    top: el.y,
    width: el.w,
    height: el.h,
    cursor: el.locked ? "default" : "grab",
    outline: selected ? "1.5px solid #2f5fed" : "none",
    outlineOffset: selected ? 1 : 0,
    touchAction: "none",
    userSelect: "none",
  };

  const body = (() => {
    switch (el.type) {
      case "text":
        return (
          <div
            style={{
              width: "100%",
              height: "100%",
              color: el.color ?? "#14171a",
              fontSize: el.fontSize ?? 12,
              fontWeight: el.fontWeight ?? 400,
              textAlign: el.align ?? "left",
              lineHeight: 1.28,
              whiteSpace: "pre-wrap",
              fontFamily:
                el.fontWeight && el.fontWeight >= 700
                  ? "var(--font-sans), system-ui, sans-serif"
                  : "var(--font-sans), system-ui, sans-serif",
              overflow: "hidden",
            }}
          >
            {el.text}
          </div>
        );
      case "rect":
        return (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: el.bg ?? "#ffffff",
              border: el.border ? `${el.borderWidth ?? 1}px solid ${el.border}` : undefined,
              borderRadius: el.radius ?? 0,
            }}
          />
        );
      case "image":
        return (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: el.bg ?? "#d6d2c4",
              border: el.border ? `${el.borderWidth ?? 1}px solid ${el.border}` : undefined,
              borderRadius: el.radius ?? 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#6d6a60",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.08em",
            }}
          >
            PHOTO
          </div>
        );
      case "barcode":
        return <Barcode w={el.w} h={el.h} />;
      case "qrcode":
        return <QrCode size={el.w} />;
      case "line":
        return <div style={{ width: "100%", height: "100%", background: el.bg ?? "#14171a" }} />;
      default:
        return null;
    }
  })();

  return (
    <div style={base} onPointerDown={(e) => onPointerDown(e, el)}>
      {body}
      {selected && !el.locked && (
        <>
          <span className="hnd tl" />
          <span className="hnd tr" />
          <span className="hnd bl" />
          <span className="hnd br" />
        </>
      )}
    </div>
  );
}

/* ---------------------------------- page --------------------------------- */

export default function DesignStudio() {
  const [templateId, setTemplateId] = useState<string>(TEMPLATES[0].id);
  const template = TEMPLATES.find((t) => t.id === templateId)!;

  const [elements, setElements] = useState<DesignElement[]>(() =>
    ID_CARD.elements.map((e) => ({ ...e }))
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { ref: stageRef, scale } = useStageScale(template.width);

  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  useEffect(() => {
    setSelectedId(null);
    const t = TEMPLATES.find((x) => x.id === templateId)!;
    setElements(t.elements.map((e) => ({ ...e })));
  }, [templateId]);

  const selected = elements.find((e) => e.id === selectedId) ?? null;

  function onElementPointerDown(e: React.PointerEvent, el: DesignElement) {
    if (el.locked) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { id: el.id, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y };
    setSelectedId(el.id);
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / (scale || 1);
    const dy = (e.clientY - d.startY) / (scale || 1);
    setElements((prev) =>
      prev.map((el) => {
        if (el.id !== d.id) return el;
        return {
          ...el,
          x: clamp(Math.round(d.origX + dx), 0, template.width - el.w),
          y: clamp(Math.round(d.origY + dy), 0, template.height - el.h),
        };
      })
    );
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  function updateSelected(patch: Partial<DesignElement>) {
    if (!selectedId) return;
    setElements((prev) => prev.map((el) => (el.id === selectedId ? { ...el, ...patch } : el)));
  }

  function addElement(type: ElementType) {
    const id = uid();
    const cx = Math.round(template.width / 2 - 90);
    const cy = Math.round(template.height / 2 - 20);
    let el: DesignElement;
    switch (type) {
      case "text":
        el = { id, type, name: "New text", x: cx, y: cy, w: 180, h: 24, text: "New text", fontSize: 14, color: "#14171a" };
        break;
      case "rect":
        el = { id, type, name: "New rectangle", x: cx, y: cy, w: 180, h: 90, bg: "#e3e3df", radius: 6 };
        break;
      case "image":
        el = { id, type, name: "New image", x: cx, y: cy, w: 120, h: 140, bg: "#d6d2c4", border: "#c1bdae", borderWidth: 1, radius: 4 };
        break;
      case "barcode":
        el = { id, type, name: "New barcode", x: cx, y: cy, w: 180, h: 56 };
        break;
      case "qrcode":
        el = { id, type, name: "New QR", x: cx, y: cy, w: 110, h: 110 };
        break;
      case "line":
        el = { id, type, name: "New line", x: cx, y: cy, w: 200, h: 1, bg: "#14171a" };
        break;
    }
    setElements((prev) => [...prev, el]);
    setSelectedId(el.id);
  }

  function deleteSelected() {
    if (!selectedId) return;
    setElements((prev) => prev.filter((el) => el.id !== selectedId));
    setSelectedId(null);
  }

  function resetTemplate() {
    const t = TEMPLATES.find((x) => x.id === templateId)!;
    setElements(t.elements.map((e) => ({ ...e })));
    setSelectedId(null);
  }

  const docStyle: React.CSSProperties = {
    position: "relative",
    width: template.width,
    height: template.height,
    background: template.background,
    transform: `scale(${scale})`,
    transformOrigin: "top left",
    boxShadow: "0 8px 40px rgba(20,23,26,0.16)",
    borderRadius: 10,
    overflow: "hidden",
  };

  const stageStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    height: template.height * scale,
    padding: 0,
  };

  return (
    <div className="root" onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
      <header className="topbar">
        <button className="iconbtn" aria-label="Back">
          <IconBack />
        </button>
        <div className="title">
          <span className="titleMain">Design Studio</span>
          <span className="titleSub">
            {template.label.toLowerCase()} · {template.subtitle.toLowerCase()} · {elements.length} layers
          </span>
        </div>
        <button className="exportbtn">Export</button>
      </header>

      <div className="metastrip">
        <span>
          {template.width} × {template.height} px &nbsp;|&nbsp; 300 dpi export &nbsp;|&nbsp;{" "}
          {selected ? `selected · ${selected.name}` : "tap an element to edit"}
        </span>
      </div>

      <div className="segwrap">
        <div className="segment" role="tablist" aria-label="Template">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={templateId === t.id}
              className={`segbtn ${templateId === t.id ? "segActive" : ""}`}
              onClick={() => setTemplateId(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="previewWrap">
        <div className="stageOuter">
          <div ref={stageRef} style={stageStyle}>
            <div
              style={docStyle}
              onClick={() => setSelectedId(null)}
            >
              {elements.map((el) => (
                <ElementView
                  key={el.id}
                  el={el}
                  selected={el.id === selectedId}
                  onPointerDown={onElementPointerDown}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <nav className="rail" aria-label="Add elements">
        <button className="railbtn" onClick={() => addElement("text")}>
          <IconText />
          <span>Text</span>
        </button>
        <button className="railbtn" onClick={() => addElement("rect")}>
          <IconRect />
          <span>Rect</span>
        </button>
        <button className="railbtn" onClick={() => addElement("image")}>
          <IconImage />
          <span>Image</span>
        </button>
        <button className="railbtn" onClick={() => addElement("barcode")}>
          <IconBarcode />
          <span>Barcode</span>
        </button>
        <button className="railbtn" onClick={() => addElement("qrcode")}>
          <IconQr />
          <span>QR</span>
        </button>
        <button
          className="railbtn"
          onClick={deleteSelected}
          disabled={!selected || selected.locked}
        >
          <IconTrash />
          <span>Delete</span>
        </button>
        <button className="railbtn" onClick={resetTemplate}>
          <IconReset />
          <span>Reset</span>
        </button>
      </nav>

      {selected && (
        <div className="sheetOverlay" onClick={() => setSelectedId(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheetHandle" />
            <div className="sheetHead">
              <span>{selected.name}</span>
              <button className="closebtn" onClick={() => setSelectedId(null)} aria-label="Close">
                <IconChevronDown />
              </button>
            </div>

            <div className="sheetBody">
              <div className="fieldGroup">
                <div className="groupLabel">Position &amp; size</div>
                <div className="grid4">
                  <NumField label="X" value={selected.x} onChange={(v) => updateSelected({ x: v })} />
                  <NumField label="Y" value={selected.y} onChange={(v) => updateSelected({ y: v })} />
                  <NumField label="W" value={selected.w} onChange={(v) => updateSelected({ w: v })} />
                  <NumField label="H" value={selected.h} onChange={(v) => updateSelected({ h: v })} />
                </div>
              </div>

              {selected.type === "text" && (
                <div className="fieldGroup">
                  <div className="groupLabel">Text</div>
                  <textarea
                    rows={2}
                    value={selected.text ?? ""}
                    onChange={(e) => updateSelected({ text: e.target.value })}
                  />
                  <div className="row">
                    <span className="rowLabel">Size</span>
                    <span className="rowValue">{selected.fontSize ?? 12}px</span>
                  </div>
                  <input
                    type="range"
                    min={6}
                    max={48}
                    value={selected.fontSize ?? 12}
                    onChange={(e) => updateSelected({ fontSize: Number(e.target.value) })}
                  />
                  <div className="row">
                    <span className="rowLabel">Weight</span>
                  </div>
                  <div className="chipRow">
                    {[400, 500, 600, 700].map((w) => (
                      <button
                        key={w}
                        className={`preset ${(selected.fontWeight ?? 400) === w ? "presetActive" : ""}`}
                        onClick={() => updateSelected({ fontWeight: w })}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                  <div className="row">
                    <span className="rowLabel">Align</span>
                  </div>
                  <div className="chipRow">
                    {(["left", "center", "right"] as const).map((a) => (
                      <button
                        key={a}
                        className={`preset ${(selected.align ?? "left") === a ? "presetActive" : ""}`}
                        onClick={() => updateSelected({ align: a })}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                  <div className="row">
                    <span className="rowLabel">Color</span>
                    <span className="rowValue">{selected.color ?? "#14171a"}</span>
                  </div>
                  <input
                    type="color"
                    value={selected.color ?? "#14171a"}
                    onChange={(e) => updateSelected({ color: e.target.value })}
                  />
                </div>
              )}

              {(selected.type === "rect" || selected.type === "line") && (
                <div className="fieldGroup">
                  <div className="groupLabel">Fill</div>
                  <input
                    type="color"
                    value={selected.bg ?? "#e3e3df"}
                    onChange={(e) => updateSelected({ bg: e.target.value })}
                  />
                  {selected.type === "rect" && (
                    <>
                      <div className="row">
                        <span className="rowLabel">Corner radius</span>
                        <span className="rowValue">{selected.radius ?? 0}px</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={40}
                        value={selected.radius ?? 0}
                        onChange={(e) => updateSelected({ radius: Number(e.target.value) })}
                      />
                    </>
                  )}
                </div>
              )}

              <button className="dangerBtn" onClick={deleteSelected} disabled={selected.locked}>
                Delete element
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .topbar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px 8px;
        }
        .iconbtn {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--surface);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--ink);
          flex-shrink: 0;
        }
        .title {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .titleMain {
          font-size: 15px;
          font-weight: 600;
          line-height: 1.2;
        }
        .titleSub {
          font-size: 11.5px;
          color: var(--ink-soft);
          font-family: var(--font-mono), monospace;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .exportbtn {
          background: var(--accent);
          color: #fff;
          border: none;
          padding: 9px 18px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 600;
          font-family: var(--font-sans), sans-serif;
          flex-shrink: 0;
        }

        .metastrip {
          padding: 0 16px 12px;
          font-family: var(--font-mono), monospace;
          font-size: 11.5px;
          color: var(--render);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .segwrap {
          padding: 0 16px 14px;
        }
        .segment {
          display: flex;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 3px;
        }
        .segbtn {
          flex: 1;
          border: none;
          background: transparent;
          padding: 8px 0;
          font-size: 14px;
          font-weight: 500;
          color: var(--ink-soft);
          border-radius: 9px;
          font-family: var(--font-sans), sans-serif;
        }
        .segActive {
          background: var(--ink);
          color: #fff;
        }

        .previewWrap {
          padding: 0 16px;
        }
        .stageOuter {
          background: repeating-linear-gradient(
              45deg,
              #ececE7 0 8px,
              #f3f3ef 8px 16px
            );
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: 12px;
          overflow: hidden;
        }

        .rail {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding: 16px 16px 24px;
        }
        .railbtn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          min-width: 64px;
          padding: 10px 6px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--ink-soft);
          flex-shrink: 0;
        }
        .railbtn span {
          font-size: 11px;
          font-weight: 500;
        }
        .railbtn:disabled {
          opacity: 0.4;
        }

        .sheetOverlay {
          position: fixed;
          inset: 0;
          background: rgba(20, 23, 26, 0.28);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          z-index: 20;
        }
        .sheet {
          width: 100%;
          max-width: 560px;
          max-height: 82vh;
          overflow-y: auto;
          background: var(--surface);
          border-radius: 20px 20px 0 0;
          padding: 10px 18px 26px;
          border: 1px solid var(--border);
          border-bottom: none;
        }
        .sheetHandle {
          width: 36px;
          height: 4px;
          border-radius: 2px;
          background: var(--border);
          margin: 4px auto 12px;
        }
        .sheetHead {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 600;
          font-size: 15px;
          margin-bottom: 14px;
        }
        .closebtn {
          border: none;
          background: transparent;
          color: var(--ink-soft);
          padding: 4px;
        }
        .sheetBody {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .fieldGroup {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .groupLabel {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--ink-soft);
          font-weight: 600;
        }
        .grid4 {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
        }
        .row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          margin-top: 4px;
        }
        .rowLabel {
          color: var(--ink-soft);
        }
        .rowValue {
          font-family: var(--font-mono), monospace;
          font-size: 12px;
        }

        textarea,
        input[type="text"],
        input[type="number"] {
          width: 100%;
          padding: 9px 12px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--bg);
          font-size: 13.5px;
          font-family: var(--font-sans), sans-serif;
          color: var(--ink);
          resize: vertical;
        }
        input[type="range"] {
          -webkit-appearance: none;
          width: 100%;
          height: 4px;
          border-radius: 2px;
          background: var(--border);
          accent-color: var(--accent);
        }
        input[type="color"] {
          width: 100%;
          height: 34px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--bg);
          padding: 2px;
        }

        .chipRow {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .preset {
          border: 1px solid var(--border);
          background: var(--bg);
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-family: var(--font-mono), monospace;
          color: var(--ink);
        }
        .presetActive {
          background: var(--ink);
          color: #fff;
          border-color: var(--ink);
        }

        .dangerBtn {
          width: 100%;
          padding: 11px 16px;
          border-radius: 12px;
          background: #fdecea;
          color: #b3261e;
          border: 1px solid #f6c6c1;
          font-size: 13.5px;
          font-weight: 600;
          font-family: var(--font-sans), sans-serif;
        }
        .dangerBtn:disabled {
          opacity: 0.4;
        }
      `}</style>

      <style jsx global>{`
        .hnd {
          position: absolute;
          width: 8px;
          height: 8px;
          background: #ffffff;
          border: 1.5px solid var(--accent);
          border-radius: 2px;
          pointer-events: none;
        }
        .hnd.tl { top: -5px; left: -5px; }
        .hnd.tr { top: -5px; right: -5px; }
        .hnd.bl { bottom: -5px; left: -5px; }
        .hnd.br { bottom: -5px; right: -5px; }
      `}</style>
    </div>
  );
}

/* -------------------------------- num field ------------------------------ */

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="numField">
      <span className="numLabel">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
      <style jsx>{`
        .numField {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .numLabel {
          font-size: 10px;
          font-weight: 600;
          color: var(--ink-soft);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        input {
          width: 100%;
          padding: 7px 8px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--bg);
          font-size: 12.5px;
          font-family: var(--font-mono), monospace;
          color: var(--ink);
          text-align: center;
        }
      `}</style>
    </label>
  );
}
