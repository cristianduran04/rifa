// src/components/AdminPanel.js
import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  setDoc,
  query,
  onSnapshot,
  getDocs,
  where,
} from "firebase/firestore";

export default function AdminPanel() {
  const [titulo, setTitulo] = useState("");
  const [precio, setPrecio] = useState(1000);
  const [ganancia, setGanancia] = useState(0);
  const [foto, setFoto] = useState("");
  const [rifas, setRifas] = useState([]); // ✅ lista de rifas
  const [stats, setStats] = useState({});
  const [searchValue, setSearchValue] = useState("");
  const [userResult, setUserResult] = useState(null);
  const [montoCustom, setMontoCustom] = useState("");

  // ===== Publicidad futura =====
  const [pubUrl, setPubUrl] = useState("");
  const [publicidad, setPublicidad] = useState(null);

  const subirPublicidad = async () => {
    if (!pubUrl) return alert("Ingresa la URL de la imagen");
    const pubRef = doc(db, "publicidad", "futura"); // documento único
    await setDoc(pubRef, { imagen: pubUrl, creadaAt: new Date() });
    alert("✅ Publicidad futura guardada");
    setPubUrl("");
  };

  // ===== Crear nueva rifa =====
  const crearRifa = async () => {
    const rifaRef = await addDoc(collection(db, "rifas"), {
      titulo,
      precioNumero: precio,
      gananciaEsperada: ganancia,
      foto: foto || "",
      estado: "activa",
      creadaAt: new Date(),
    });

    // Inicializar 100 números (00 al 99)
    for (let i = 0; i < 100; i++) {
      await setDoc(
        doc(db, "rifas", rifaRef.id, "numeros", String(i).padStart(2, "0")),
        {
          number: i,
          status: "available",
        }
      );
    }

    alert("✅ Rifa creada!");
    setTitulo("");
    setPrecio(1000);
    setGanancia(0);
    setFoto("");
  };

  // ===== Recargar saldo =====
  const recargar = async (uid, monto) => {
    if (!monto || monto <= 0) return alert("⚠️ Ingresa un monto válido");
    const userRef = doc(db, "usuarios", uid);
    await updateDoc(userRef, { saldo: (userResult.saldo || 0) + monto });
    alert("💰 Saldo recargado");

    setUserResult(null);
    setSearchValue("");
    setMontoCustom("");
  };

  // ===== Buscar usuario =====
  const buscarUsuario = async () => {
    if (!searchValue) return;

    let q = query(collection(db, "usuarios"), where("correo", "==", searchValue));
    let snap = await getDocs(q);

    if (snap.empty) {
      q = query(collection(db, "usuarios"), where("telefono", "==", searchValue));
      snap = await getDocs(q);
    }

    if (!snap.empty) {
      const user = { id: snap.docs[0].id, ...snap.docs[0].data() };
      setUserResult(user);
    } else {
      setUserResult(null);
      alert("❌ Usuario no encontrado");
    }
  };

  // ===== Escuchar todas las rifas =====
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "rifas"), (snap) => {
      const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRifas(lista);

      // calcular stats de cada rifa
      lista.forEach((rifa) => {
        const numsRef = collection(db, "rifas", rifa.id, "numeros");
        onSnapshot(numsRef, (numsSnap) => {
          const total = numsSnap.size;
          const vendidos = numsSnap.docs.filter(
            (d) => d.data().status === "taken"
          ).length;
          const disponibles = total - vendidos;
          const recaudado = vendidos * rifa.precioNumero;
          setStats((prev) => ({
            ...prev,
            [rifa.id]: { total, vendidos, disponibles, recaudado },
          }));
        });
      });
    });

    // escuchar publicidad futura
    const pubRef = doc(db, "publicidad", "futura");
    const unsubPub = onSnapshot(pubRef, (snap) => {
      if (snap.exists()) setPublicidad(snap.data());
    });

    return () => {
      unsub();
      unsubPub();
    };
  }, []);

  // ===== Estilos =====
  const inputStyle = {
    padding: "6px",
    margin: "5px 0",
    borderRadius: "5px",
    border: "1px solid #ccc",
    width: "100%",
  };

  const btnPrimary = {
    padding: "6px 12px",
    border: "none",
    borderRadius: "5px",
    background: "#1976d2",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
  };

  const btnSmall = {
    padding: "4px 8px",
    margin: "0 5px",
    border: "none",
    borderRadius: "5px",
    background: "#43a047",
    color: "white",
    cursor: "pointer",
  };

  const cardBox = {
    marginTop: "20px",
    padding: "15px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    background: "#fafafa",
  };

  const userCard = {
    marginTop: "15px",
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    background: "white",
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>📌 Panel Admin</h2>

      {/* ===== Publicidad futura ===== */}
      <section style={cardBox}>
        <h3>🖼️ Publicidad futura</h3>
        <input
          style={inputStyle}
          placeholder="URL de la imagen"
          value={pubUrl}
          onChange={(e) => setPubUrl(e.target.value)}
        />
        <button style={btnPrimary} onClick={subirPublicidad}>
          Guardar publicidad
        </button>
        {publicidad && (
          <div style={{ marginTop: 10, textAlign: "center" }}>
            <img
              src={publicidad.imagen}
              alt="Publicidad futura"
              style={{
                width: "100%",
                maxWidth: "350px",
                borderRadius: "8px",
                objectFit: "cover",
              }}
            />
          </div>
        )}
      </section>

      {/* Crear rifa */}
      <section style={cardBox}>
        <h3>Crear Rifa</h3>
        <label>Título</label>
        <input
          style={inputStyle}
          placeholder="Título de la rifa"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
        <label>Precio por número</label>
        <input
          style={inputStyle}
          type="number"
          value={precio}
          onChange={(e) => setPrecio(Number(e.target.value))}
        />
        <label>Ganancia esperada</label>
        <input
          style={inputStyle}
          type="number"
          value={ganancia}
          onChange={(e) => setGanancia(Number(e.target.value))}
        />
        <label>URL de foto (opcional)</label>
        <input
          style={inputStyle}
          placeholder="https://ejemplo.com/foto.jpg"
          value={foto}
          onChange={(e) => setFoto(e.target.value)}
        />
        <button style={{ ...btnPrimary, marginTop: "10px" }} onClick={crearRifa}>
          Crear
        </button>
      </section>

      {/* Lista de rifas */}
      <section style={cardBox}>
        <h3>🎟️ Rifas registradas</h3>
        {rifas.length > 0 ? (
          rifas.map((r) => (
            <div
              key={r.id}
              style={{
                marginBottom: "15px",
                padding: "10px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                background: "white",
              }}
            >
              <p><b>{r.titulo}</b> ({r.estado})</p>
              {r.foto && (
                <img
                  src={r.foto}
                  alt="foto rifa"
                  width="120"
                  style={{ borderRadius: "8px", marginBottom: "8px" }}
                />
              )}
              <p>Precio por número: ${r.precioNumero}</p>
              <p>Ganancia esperada: ${r.gananciaEsperada || 0}</p>
              {stats[r.id] && (
                <>
                  <p>Total números: {stats[r.id].total}</p>
                  <p>Vendidos: {stats[r.id].vendidos}</p>
                  <p>Disponibles: {stats[r.id].disponibles}</p>
                  <p><b>Total recaudado: ${stats[r.id].recaudado}</b></p>
                </>
              )}
            </div>
          ))
        ) : (
          <p>No hay rifas creadas</p>
        )}
      </section>

      {/* Buscar usuario */}
      <section style={cardBox}>
        <h3>👥 Buscar usuario</h3>
        <input
          style={inputStyle}
          placeholder="Correo o teléfono"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
        <button style={btnPrimary} onClick={buscarUsuario}>
          Buscar
        </button>

        {userResult && (
          <div style={userCard}>
            <p>
              <b>{userResult.nombre}</b> ({userResult.correo || userResult.telefono})
            </p>
            <p>Saldo: ${userResult.saldo || 0}</p>
            <div>
              <button style={btnSmall} onClick={() => recargar(userResult.id, 5000)}>+5.000</button>
              <button style={btnSmall} onClick={() => recargar(userResult.id, 10000)}>+10.000</button>
              <input
                type="number"
                placeholder="Otro monto"
                style={inputStyle}
                value={montoCustom}
                onChange={(e) => setMontoCustom(e.target.value)}
              />
              <button style={btnSmall} onClick={() => recargar(userResult.id, Number(montoCustom))}>
                Recargar
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}


