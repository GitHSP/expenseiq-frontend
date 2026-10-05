import { useState, useEffect } from "react";
import Assistant from "../pages/Assistant";
import Icon from "./Icon";

// Floating chat button (bottom-right) that opens the assistant in a panel
// over any page. The panel stays mounted while hidden so an in-flight
// reply and the scroll position survive closing and reopening it.
export default function AssistantWidget({ onActionsTaken }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <div
        className={`assistant-panel${open ? " open" : ""}`}
        role="dialog"
        aria-label="Assistant"
        aria-hidden={!open}
      >
        <Assistant onActionsTaken={onActionsTaken} onClose={() => setOpen(false)} />
      </div>

      <button
        className={`assistant-fab${open ? " open" : ""}`}
        onClick={() => setOpen(o => !o)}
        aria-label={open ? "Close assistant" : "Open assistant"}
        title="Assistant"
      >
        <Icon name={open ? "x" : "chat"} size={open ? 22 : 26} />
      </button>
    </>
  );
}
