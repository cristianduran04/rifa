// src/components/Login.js
import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [telefono, setTelefono] = useState("");
  const [modoRegistro, setModoRegistro] = useState(false); // true = registrar

  const handleRegister = async () => {
    if (!telefono) return alert("⚠️ Ingresa un número de teléfono para registrarte");
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      await setDoc(doc(db, "usuarios", user.uid), {
        nombre: email.split("@")[0],
        correo: email,
        telefono,
        saldo: 0,
        rol: "user",
      });

      alert("Usuario registrado correctamente ✅");
      setModoRegistro(false);
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
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>{modoRegistro ? "Registro" : "Login"}</h2>

        <input
          style={styles.input}
          type="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {modoRegistro && (
          <input
            style={styles.input}
            type="text"
            placeholder="Teléfono"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
          />
        )}

        <input
          style={styles.input}
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          style={styles.buttonPrimary}
          onClick={modoRegistro ? handleRegister : handleLogin}
        >
          {modoRegistro ? "Registrarse" : "Ingresar"}
        </button>

        <p style={styles.toggleText}>
          {modoRegistro ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?"}{" "}
          <span
            style={styles.toggleLink}
            onClick={() => setModoRegistro(!modoRegistro)}
          >
            {modoRegistro ? "Ingresar" : "Registrarse"}
          </span>
        </p>
      </div>
    </div>
  );
}

// ===== Estilos CSS-in-JS =====
const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f5f5f5",
    padding: "10px",
  },
  card: {
    width: "100%",
    maxWidth: "400px",
    background: "white",
    padding: "30px 20px",
    borderRadius: "10px",
    boxShadow: "0 5px 15px rgba(0,0,0,0.2)",
    display: "flex",
    flexDirection: "column",
  },
  title: {
    textAlign: "center",
    marginBottom: "20px",
    color: "#1976d2",
  },
  input: {
    padding: "12px",
    margin: "8px 0",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "16px",
  },
  buttonPrimary: {
    padding: "12px",
    marginTop: "15px",
    border: "none",
    borderRadius: "6px",
    background: "#1976d2",
    color: "white",
    fontWeight: "bold",
    fontSize: "16px",
    cursor: "pointer",
  },
  toggleText: {
    textAlign: "center",
    marginTop: "15px",
    fontSize: "14px",
    color: "#555",
  },
  toggleLink: {
    color: "#1976d2",
    cursor: "pointer",
    fontWeight: "bold",
  },
};

