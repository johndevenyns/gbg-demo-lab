import { getReadableTextColor, parseCssColor } from "@/lib/formStyleUtils";

const TEXT_CANDIDATE_SELECTOR = "a, button, span, p, strong, em, small, label, li, h1, h2, h3, h4, h5, h6, div";

const hasDirectText = (element: HTMLElement) =>
  Array.from(element.childNodes).some(
    (node) => node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim())
  );

const isVisible = (win: Window, element: HTMLElement) => {
  const computed = win.getComputedStyle(element);
  return computed.display !== "none" && computed.visibility !== "hidden" && computed.opacity !== "0";
};

const getEffectiveBackground = (win: Window, element: HTMLElement) => {
  let current: HTMLElement | null = element;

  while (current) {
    const background = win.getComputedStyle(current).backgroundColor;
    const parsed = parseCssColor(background);
    if (parsed && parsed.a > 0.05) return background;
    current = current.parentElement;
  }

  return win.getComputedStyle(win.document.body).backgroundColor || "#ffffff";
};

const applyReadableColor = (win: Window, target: HTMLElement, readableColor: string) => {
  const textNodes = [
    target,
    ...Array.from(target.querySelectorAll<HTMLElement>(TEXT_CANDIDATE_SELECTOR)),
  ];

  textNodes.forEach((node) => {
    if (!isVisible(win, node)) return;
    node.style.setProperty("color", readableColor, "important");
  });

  target.querySelectorAll("*").forEach((node) => {
    const element = node as HTMLElement;
    const tagName = element.tagName?.toLowerCase() || "";
    const className = typeof element.className === "string" ? element.className.toLowerCase() : "";
    const isSvg = tagName === "svg" || typeof (node as Element).closest === "function" && Boolean((node as Element).closest("svg"));

    if (typeof element.style?.setProperty !== "function") return;

    if (isSvg) {
      const iconStyles = win.getComputedStyle(element);
      const stroke = iconStyles.stroke;
      const fill = iconStyles.fill;

      element.style.setProperty("color", readableColor, "important");
      if (stroke && stroke !== "none" && !stroke.includes("url(")) {
        element.style.setProperty("stroke", readableColor, "important");
      }
      if (fill && fill !== "none" && !fill.includes("url(")) {
        element.style.setProperty("fill", readableColor, "important");
      }
      return;
    }

    if (tagName === "i" || className.includes("icon") || className.includes("ld-")) {
      element.style.setProperty("color", readableColor, "important");
    }
  });
};

export function enhanceHeaderPreviewIframe(iframe: HTMLIFrameElement, minHeight = 80) {
  const sync = () => {
    try {
      const doc = iframe.contentDocument;
      const win = iframe.contentWindow;
      const body = doc?.body;

      if (doc && win && body) {
        const processed = new Set<HTMLElement>();
        const candidates = Array.from(body.querySelectorAll<HTMLElement>(TEXT_CANDIDATE_SELECTOR));

        candidates.forEach((candidate) => {
          if (!hasDirectText(candidate) || !isVisible(win, candidate)) return;

          const target = (candidate.closest("a, button, [role='button']") as HTMLElement | null) || candidate;
          if (processed.has(target) || !isVisible(win, target)) return;

          const computed = win.getComputedStyle(target);
          const background = getEffectiveBackground(win, target);
          const readableColor = getReadableTextColor(computed.color, background);

          if (readableColor !== computed.color) {
            applyReadableColor(win, target, readableColor);
          }

          processed.add(target);
        });

        const firstChild = body.firstElementChild as HTMLElement | null;
        const height = firstChild?.offsetHeight || body.scrollHeight || minHeight;
        iframe.style.height = `${Math.max(height, minHeight)}px`;
        return;
      }
    } catch {
      // fall through to min height fallback
    }

    iframe.style.height = `${minHeight}px`;
  };

  sync();
  window.setTimeout(sync, 160);
  window.setTimeout(sync, 500);
}