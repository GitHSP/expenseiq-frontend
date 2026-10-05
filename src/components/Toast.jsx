import Icon from "./Icon";

export default function Toast({ toast }) {
  if (!toast) return null;
  const bg = toast.type === "error" ? "#FF6B6B" : "#55EFC4";
  return (
    <div className="toast" style={{ background: bg, color: "#0f0f1a", display: "flex", alignItems: "center", gap: 8 }}>
      <Icon name={toast.type === "error" ? "alert" : "check-circle"} size={16} />
      {toast.msg}
    </div>
  );
}