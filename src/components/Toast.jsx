export default function Toast({ toast }) {
  if (!toast) return null;
  const bg = toast.type === "error" ? "#FF6B6B" : "#55EFC4";
  return (
    <div className="toast" style={{ background: bg, color: "#0f0f1a" }}>
      {toast.msg}
    </div>
  );
}