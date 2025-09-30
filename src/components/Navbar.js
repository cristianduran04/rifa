// src/components/Navbar.js
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

export default function Navbar({ nombre }) {
  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log("✅ Sesión cerrada");
    } catch (err) {
      console.error("❌ Error al cerrar sesión:", err);
    }
  };

  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "10px 20px",
      background: "#1976d2",
      color: "white"
    }}>
      <h3>{nombre}</h3>
      <button 
        onClick={handleLogout} 
        style={{
          background: "white",
          color: "#1976d2",
          border: "none",
          padding: "6px 12px",
          borderRadius: "6px",
          cursor: "pointer",
          fontWeight: "bold"
        }}
      >
        Cerrar sesión
      </button>
    </div>
  );
}
