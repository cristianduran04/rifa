// src/components/AdminPanel.js
import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
  query,
  onSnapshot,
  getDocs,
  where,
} from "firebase/firestore";

export default function AdminPanel() {
  const [rifas, setRifas] = useState([]);
  const [stats, setStats] = useState({});
  const [userResult, setUserResult] = useState(null);

  // Modal states
  const [modalRifa, setModalRifa] = useState(false);
  const [modalUsuario, setModalUsuario] = useState(false);

  // Campos rifa
  const [titulo, setTitulo] = useState("");
  const [precio, setPrecio] = useState(1000);
  const [ganancia, setGanancia] = useState(0);
  const [foto, setFoto] = useState("");
  const [finRifa, setFinRifa] = useState(""); // fecha de fin
  const [editarId, setEditarId] = useState(null);

  // Campos usuario
  const [searchValue, setSearchValue] = useState("");
  const [montoCustom, setMontoCustom] = useState("");

  // ==== Escuchar rifas ====
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "rifas"), (snap) => {
      const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const now = new Date();

      lista.forEach(async (rifa) => {
        if (rifa.fin && now >= rifa.fin.toDate() && rifa.estado === "activa") {
          // Cerrar rifa automáticamente
          const rRef = doc(db, "rifas", rifa.id);
          await updateDoc(rRef, { estado: "cerrada" });
        }
        const numsRef = collection(db, "rifas", rifa.id, "numeros");
        onSnapshot(numsRef, (numsSnap) => {
          const total = numsSnap.size;
          const vendidos = numsSnap.docs.filter(
            (d) => d.data().status === "taken"
          ).length;
          setStats((prev) => ({
            ...prev,
            [rifa.id]: { total, vendidos, disponibles: total - vendidos, recaudado: vendidos * rifa.precioNumero },
          }));
        });
      });

      setRifas(lista);
    });
    return () => unsub();
  }, []);

  // ===== Crear o editar rifa =====
  const guardarRifa = async () => {
    if (!titulo) return alert("Ingresa un título");
    const data = {
      titulo, precioNumero: precio, gananciaEsperada: ganancia,
      foto: foto || "", estado: "activa", creadaAt: new Date(),
      fin: finRifa ? new Date(finRifa) : null,
    };

    if (editarId) {
      // Editar
      const rifaRef = doc(db, "rifas", editarId);
      await updateDoc(rifaRef, data);
      alert("✅ Rifa actualizada!");
      setEditarId(null);
    } else {
      // Crear
      const rifaRef = await addDoc(collection(db, "rifas"), data);
      for (let i = 0; i < 100; i++) {
        await setDoc(doc(db, "rifas", rifaRef.id, "numeros", String(i).padStart(2, "0")), { number: i, status: "available" });
      }
      alert("✅ Rifa creada!");
    }

    // reset
    setTitulo(""); setPrecio(1000); setGanancia(0); setFoto(""); setFinRifa("");
    setModalRifa(false);
  };

  const eliminarRifa = async (id) => {
    if (!window.confirm("¿Deseas eliminar esta rifa?")) return;
    await deleteDoc(doc(db, "rifas", id));
    alert("❌ Rifa eliminada");
  };

  const editarRifa = (r) => {
    setTitulo(r.titulo); setPrecio(r.precioNumero); setGanancia(r.gananciaEsperada || 0);
    setFoto(r.foto || ""); setFinRifa(r.fin ? r.fin.toDate().toISOString().slice(0,16) : "");
    setEditarId(r.id);
    setModalRifa(true);
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

    if (!snap.empty) setUserResult({ id: snap.docs[0].id, ...snap.docs[0].data() });
    else alert("❌ Usuario no encontrado");
  };

  const recargar = async (uid, monto) => {
    if (!monto || monto <= 0) return alert("Monto inválido");
    const userRef = doc(db, "usuarios", uid);
    await updateDoc(userRef, { saldo: (userResult.saldo || 0) + monto });
    alert("💰 Saldo recargado");
    setUserResult(null); setSearchValue(""); setMontoCustom(""); setModalUsuario(false);
  };

  // ==== Estilos ====
  const btnPrimary = { padding: "10px 15px", border: "none", borderRadius: "6px", background: "#1976d2", color: "white", cursor: "pointer", fontWeight: "bold" };
  const btnSmall = { padding: "4px 8px", margin: "0 5px", border: "none", borderRadius: "5px", background: "#43a047", color: "white", cursor: "pointer" };
  const modalStyle = { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 };
  const modalContent = { background: "white", padding: "20px", borderRadius: "10px", width: "90%", maxWidth: "400px" };

  return (
    <div style={{ padding: 20 }}>
      <h2>📌 Panel Admin</h2>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button style={btnPrimary} onClick={() => { setEditarId(null); setModalRifa(true); }}>Crear Rifa</button>
        <button style={btnPrimary} onClick={() => setModalUsuario(true)}>Buscar Usuario</button>
      </div>

      {/* Rifas */}
      {rifas.length > 0 ? rifas.map(r => (
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
          {r.fin && <p>Fin de la rifa: {r.fin.toDate().toLocaleString()}</p>}
          {stats[r.id] && (
            <>
              <p>Total números: {stats[r.id].total}</p>
              <p>Vendidos: {stats[r.id].vendidos}</p>
              <p>Disponibles: {stats[r.id].disponibles}</p>
              <p><b>Total recaudado: ${stats[r.id].recaudado}</b></p>
            </>
          )}
          <div style={{ marginTop: 5 }}>
            <button style={btnSmall} onClick={() => editarRifa(r)}>Editar</button>
            <button style={{ ...btnSmall, background: "#e53935" }} onClick={() => eliminarRifa(r.id)}>Eliminar</button>
          </div>
        </div>
      )) : <p>No hay rifas creadas</p>}

      {/* Modal Crear/Editar Rifa */}
      {modalRifa && (
        <div style={modalStyle} onClick={() => setModalRifa(false)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <h3>{editarId ? "Editar Rifa" : "Crear Rifa"}</h3>
            <input placeholder="Título" style={{ width: "100%", padding: "8px", margin: "5px 0" }} value={titulo} onChange={e => setTitulo(e.target.value)} />
            <input type="number" placeholder="Precio" style={{ width: "100%", padding: "8px", margin: "5px 0" }} value={precio} onChange={e => setPrecio(Number(e.target.value))} />
            <input type="number" placeholder="Ganancia" style={{ width: "100%", padding: "8px", margin: "5px 0" }} value={ganancia} onChange={e => setGanancia(Number(e.target.value))} />
            <input placeholder="URL de foto" style={{ width: "100%", padding: "8px", margin: "5px 0" }} value={foto} onChange={e => setFoto(e.target.value)} />
            <label>Fin de la rifa:</label>
            <input type="datetime-local" style={{ width: "100%", padding: "8px", margin: "5px 0" }} value={finRifa} onChange={e => setFinRifa(e.target.value)} />
            <button style={{ ...btnPrimary, width: "100%", marginTop: "10px" }} onClick={guardarRifa}>{editarId ? "Actualizar" : "Crear"}</button>
          </div>
        </div>
      )}

      {/* Modal Buscar Usuario */}
      {modalUsuario && (
        <div style={modalStyle} onClick={() => setModalUsuario(false)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <h3>Buscar Usuario</h3>
            <input placeholder="Correo o teléfono" style={{ width: "100%", padding: "8px", margin: "5px 0" }} value={searchValue} onChange={e => setSearchValue(e.target.value)} />
            <button style={{ ...btnPrimary, width: "100%", marginTop: 5 }} onClick={buscarUsuario}>Buscar</button>

            {userResult && (
              <div style={{ marginTop: 10 }}>
                <p><b>{userResult.nombre}</b> ({userResult.correo || userResult.telefono})</p>
                <p>Saldo: ${userResult.saldo || 0}</p>
                <input type="number" placeholder="Otro monto" style={{ width: "100%", padding: 8, margin: "5px 0" }} value={montoCustom} onChange={e => setMontoCustom(e.target.value)} />
                <button style={{ ...btnPrimary, width: "100%" }} onClick={() => recargar(userResult.id, Number(montoCustom))}>Recargar</button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}



