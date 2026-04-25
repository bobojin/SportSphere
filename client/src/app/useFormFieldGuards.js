import { useEffect } from "react";

export function useFormFieldGuards() {
  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    const selector = "input, textarea";

    const applyGuards = (root) => {
      if (!(root instanceof Element) && root !== document) {
        return;
      }

      const fields = root === document ? document.querySelectorAll(selector) : root.querySelectorAll(selector);
      fields.forEach((field) => {
        field.setAttribute("data-1p-ignore", "true");
        field.setAttribute("data-op-ignore", "true");
        field.setAttribute("data-lpignore", "true");
      });
    };

    applyGuards(document);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) {
            return;
          }

          if (node.matches(selector)) {
            node.setAttribute("data-1p-ignore", "true");
            node.setAttribute("data-op-ignore", "true");
            node.setAttribute("data-lpignore", "true");
          }

          applyGuards(node);
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);
}
