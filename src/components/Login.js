// src/components/Login.js
import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [telefono, setTelefono] = useState("");

  const handleRegister = async () => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      // ✅ Crear documento en Firestore con correo y teléfono
      await setDoc(doc(db, "usuarios", user.uid), {
        nombre: email.split("@")[0],
        correo: email,          // <-- IMPORTANTE
        telefono: telefono || "", // <-- IMPORTANTE
        saldo: 0,
        rol: "user"
      });

      alert("Usuario registrado correctamente ✅");
    } catch (err) {
      alert("Error al registrar: " + err.message);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert("Sesión iniciada ✅");
    } catch (err) {
      alert("Error al iniciar sesión: " + err.message);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Login / Registro</h2>
      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      /><br />
      <input
        placeholder="Teléfono"
        value={telefono}
        onChange={(e) => setTelefono(e.target.value)}
      /><br />
      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      /><br />

      <button onClick={handleLogin}>Ingresar</button>
      <button onClick={handleRegister}>Registrarse</button>
    </div>
  );
}

