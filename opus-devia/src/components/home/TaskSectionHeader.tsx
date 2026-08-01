import { Link } from "react-router-dom";

export default function TaskSectionHeader() {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      margin: "8px 10px 0", padding: "0 2px"
    }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: "#F5F5F5" }}>Today's Task</span>
      <Link to="/tasks" style={{ fontSize: 10, fontWeight: 500, color: "#A8A8A8", textDecoration: "none" }}>
        View all
      </Link>
    </div>
  );
}
