import AdminPanel from "./AdminPanel";
import Navbar from "./Navbar";

export default function AdminDashboard() {
  return (
    <div>
      <Navbar nombre="📌 Administrador" />
      <div style={{ padding: 20 }}>
        <AdminPanel />
      </div>
    </div>
  );
}

