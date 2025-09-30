// src/App.js
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import AdminDashboard from "./components/AdminDashboard";
import UsuarioDashboard from "./components/UsuarioDashboard";
import Login from "./components/Login";

function App() {
  const [usuario, setUsuario] = useState(null);
  const [rol, setRol] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("Usuario logueado:", user.uid);
        const ref = doc(db, "usuarios", user.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          console.log("Datos Firestore:", snap.data());
          setUsuario(user);
          setRol(snap.data().rol);
        } else {
          // ⚡ Crear doc con correo y teléfono vacío si no existía
          await setDoc(ref, {
            nombre: user.email ? user.email.split("@")[0] : "SinNombre",
            correo: user.email || "",   // <-- Guardar correo
            telefono: "",               // <-- Teléfono vacío
            saldo: 0,
            rol: "user"
          });
          console.log("Documento creado en Firestore con rol=user");
          setUsuario(user);
          setRol("user");
        }
      } else {
        setUsuario(null);
        setRol(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  if (loading) return <p>Cargando...</p>;
  if (!usuario) return <Login />;

  return rol === "admin" ? <AdminDashboard /> : <UsuarioDashboard />;
}

export default App;
