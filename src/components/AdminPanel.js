// src/components/AdminPanel.js
import { useEffect, useState } from "react";
import { db, storage } from "../firebase";
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
  getDoc,
  orderBy,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function AdminPanel() {
  const [rifas, setRifas] = useState([]);
  const [stats, setStats] = useState({});
  const [userResult, setUserResult] = useState(null);

  // Modals
  const [modalRifa, setModalRifa] = useState(false);
  const [modalUsuario, setModalUsuario] = useState(false);
  const [modalPublicidad, setModalPublicidad] = useState(false);

  // Campos Rifa
  const [titulo, setTitulo] = useState("");
  const [precio, setPrecio] = useState(1000);
  const [ganancia, setGanancia] = useState(0);
  const [foto, setFoto] = useState("");
  const [finRifa, setFinRifa] = useState("");
  const [editarId, setEditarId] = useState(null);

  // Campos Usuario
  const [searchValue, setSearchValue] = useState("");
  const [montoCustom, setMontoCustom] = useState("");

  // Publicidad
  const [publicidadFile, setPublicidadFile] = useState(null);

  // ==== Escuchar rifas ordenadas por creación ====
useEffect(() => {
  const q = query(collection(db, "rifas"), orderBy("creadaAt", "desc")); // <-- orden descendente
  const unsub = onSnapshot(q, (snap) => {
    const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const now = new Date();

    lista.forEach(async (rifa) => {
      // Cerrar rifas automáticamente si ya pasaron
      if (rifa.fin && now >= rifa.fin.toDate() && rifa.estado === "activa") {
        const rRef = doc(db, "rifas", rifa.id);
        await updateDoc(rRef, { estado: "cerrada" });
      }

      // Escuchar los números de cada rifa para estadísticas
      const numsRef = collection(db, "rifas", rifa.id, "numeros");
      onSnapshot(numsRef, (numsSnap) => {
        const total = numsSnap.size;
        const vendidos = numsSnap.docs.filter(d => d.data().status === "taken").length;
        setStats((prev) => ({
          ...prev,
          [rifa.id]: {
            total,
            vendidos,
            disponibles: total - vendidos,
            recaudado: vendidos * rifa.precioNumero,
          },
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
    if (!precio || precio <= 0) return alert("Precio inválido");
    if (!ganancia || ganancia < 0) return alert("Ganancia inválida");

    const data = {
      titulo,
      precioNumero: precio,
      gananciaEsperada: ganancia,
      foto: foto || "",
      estado: "activa",
      creadaAt: new Date(),
      fin: finRifa ? new Date(finRifa) : null,
    };

    if (editarId) {
      const rifaRef = doc(db, "rifas", editarId);
      await updateDoc(rifaRef, data);
      alert("✅ Rifa actualizada!");
      setEditarId(null);
    } else {
      const rifaRef = await addDoc(collection(db, "rifas"), data);
      for (let i = 0; i < 100; i++) {
        await setDoc(
          doc(db, "rifas", rifaRef.id, "numeros", String(i).padStart(2, "0")),
          { number: i, status: "available" }
        );
      }
      alert("✅ Rifa creada!");
    }

    setTitulo("");
    setPrecio(1000);
    setGanancia(0);
    setFoto("");
    setFinRifa("");
    setModalRifa(false);
  };

  const eliminarRifa = async (id) => {
    if (!window.confirm("¿Deseas eliminar esta rifa?")) return;
    await deleteDoc(doc(db, "rifas", id));
    alert("❌ Rifa eliminada");
  };

  const editarRifa = (r) => {
    setTitulo(r.titulo);
    setPrecio(r.precioNumero);
    setGanancia(r.gananciaEsperada || 0);
    setFoto(r.foto || "");
    setFinRifa(r.fin ? r.fin.toDate().toISOString().slice(0, 16) : "");
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

    if (!snap.empty)
      setUserResult({ id: snap.docs[0].id, ...snap.docs[0].data() });
    else alert("❌ Usuario no encontrado");
  };

  const recargar = async (uid, monto) => {
    if (!monto || monto <= 0) return alert("Monto inválido");
    const userRef = doc(db, "usuarios", uid);
    await updateDoc(userRef, { saldo: (userResult.saldo || 0) + monto });
    alert("💰 Saldo recargado");
    setUserResult(null);
    setSearchValue("");
    setMontoCustom("");
    setModalUsuario(false);
  };

  // ===== Asignar número ganador =====
  const asignarGanador = async (rifaId, numeroGanador) => {
    if (!numeroGanador) return alert("Ingresa el número ganador");

    const numRef = doc(db, "rifas", rifaId, "numeros", numeroGanador);
    const numSnap = await getDoc(numRef);

    let telefonoGanador = null;
    if (numSnap.exists()) {
      const usuarioId = numSnap.data().usuario;
      if (usuarioId) {
        const userRef = doc(db, "usuarios", usuarioId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          telefonoGanador = userSnap.data().telefono;
        }
      }
    }

    const rifaRef = doc(db, "rifas", rifaId);
    await updateDoc(rifaRef, {
      numeroGanador,
      usuarioGanador: telefonoGanador || "Número no vendido",
      estado: "cerrada",
    });

    alert(`✅ Rifa cerrada. Número ganador: ${numeroGanador}`);
  };

  // ===== Subir publicidad =====
  const subirPublicidad = async () => {
    if (!publicidadFile) return alert("Selecciona un archivo");
    const storageRef = ref(
      storage,
      `publicidad/${Date.now()}_${publicidadFile.name}`
    );
    await uploadBytes(storageRef, publicidadFile);
    const url = await getDownloadURL(storageRef);

    const pubRef = doc(db, "publicidad", "banner");
    await setDoc(pubRef, { url, creadaAt: new Date() });

    alert("✅ Publicidad subida!");
    setModalPublicidad(false);
    setPublicidadFile(null);
  };

  // ==== Estilos ====
  const btnPrimary = {
    padding: "10px 15px",
    border: "none",
    borderRadius: "6px",
    background: "#1976d2",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold",
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
  const btnDanger = { ...btnSmall, background: "#e53935" };
  const btnWinner = {
    padding: "5px 10px",
    border: "none",
    borderRadius: "5px",
    background: "#f57c00",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold",
  };
  const modalStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  };
  const modalContent = {
    background: "white",
    padding: "20px",
    borderRadius: "10px",
    width: "90%",
    maxWidth: "400px",
  };

  // ==== JSX ====
  return (
    <div style={{ padding: 20 }}>
      <h2>📌 Panel Admin</h2>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button
          style={btnPrimary}
          onClick={() => {
            setEditarId(null);
            setModalRifa(true);
          }}
        >
          Crear Rifa
        </button>
        <button style={btnPrimary} onClick={() => setModalUsuario(true)}>
          Buscar Usuario
        </button>
        <button style={btnPrimary} onClick={() => setModalPublicidad(true)}>
          Publicidad
        </button>
      </div>

      {/* Rifas */}
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
            <p>
              <b>{r.titulo}</b>{" "}
              <span
                style={{
                  color: r.estado === "activa" ? "green" : "gray",
                  fontWeight: "bold",
                }}
              >
                ({r.estado === "activa" ? "Activo" : "Cerrada"})
              </span>
            </p>
            {r.foto && (
              <img
                src={r.foto}
                alt="foto rifa"
                width="120"
                style={{ borderRadius: "8px", marginBottom: "8px" }}
              />
            )}
            <p>Precio por número: ${r.precioNumero}</p>
            <p>Premio Rifa: ${r.gananciaEsperada || 0}</p>
            {r.fin && <p>Fin de la rifa: {r.fin.toDate().toLocaleString()}</p>}
            {stats[r.id] && (
              <>
                <p>Total números: {stats[r.id].total}</p>
                <p>Vendidos: {stats[r.id].vendidos}</p>
                <p>Disponibles: {stats[r.id].disponibles}</p>
                <p>
                  <b>Total recaudado: ${stats[r.id].recaudado}</b>
                </p>
              </>
            )}

            {/* Número ganador */}
            {r.estado === "activa" && (
              <div style={{ marginTop: 5 }}>
                <input
                  type="text"
                  placeholder="Número ganador"
                  value={r.numeroGanadorInput || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRifas((prev) =>
                      prev.map((x) =>
                        x.id === r.id ? { ...x, numeroGanadorInput: val } : x
                      )
                    );
                  }}
                  style={{ padding: "4px 8px", width: "120px", marginRight: "5px" }}
                />
                <button
                  style={btnWinner}
                  onClick={() => asignarGanador(r.id, r.numeroGanadorInput)}
                >
                  Terminar rifa
                </button>
              </div>
            )}

            {r.estado === "cerrada" && (
              <p>
                🎉 Ganador:{" "}
                {r.usuarioGanador ? r.usuarioGanador : "Número no vendido"} | Número:{" "}
                {r.numeroGanador}
              </p>
            )}

            <div style={{ marginTop: 5 }}>
              <button style={btnSmall} onClick={() => editarRifa(r)}>
                Editar
              </button>
              <button style={btnDanger} onClick={() => eliminarRifa(r.id)}>
                Eliminar
              </button>
            </div>
          </div>
        ))
      ) : (
        <p>No hay rifas creadas</p>
      )}

      {/* Modal Crear/Editar Rifa */}
      {modalRifa && (
        <div style={modalStyle} onClick={() => setModalRifa(false)}>
          <div style={modalContent} onClick={(e) => e.stopPropagation()}>
            <h3>{editarId ? "Editar Rifa" : "Crear Rifa"}</h3>
            <input
              placeholder="Título"
              style={{ width: "100%", padding: "8px", margin: "5px 0" }}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
            <input
              type="number"
              placeholder="Precio"
              style={{ width: "100%", padding: "8px", margin: "5px 0" }}
              value={precio}
              onChange={(e) => setPrecio(Number(e.target.value))}
            />
            <input
              type="number"
              placeholder="Ganancia"
              style={{ width: "100%", padding: "8px", margin: "5px 0" }}
              value={ganancia}
              onChange={(e) => setGanancia(Number(e.target.value))}
            />
            <input
              placeholder="URL de foto"
              style={{ width: "100%", padding: "8px", margin: "5px 0" }}
              value={foto}
              onChange={(e) => setFoto(e.target.value)}
            />
            <label>Fin de la rifa:</label>
            <input
              type="datetime-local"
              style={{ width: "100%", padding: "8px", margin: "5px 0" }}
              value={finRifa}
              onChange={(e) => setFinRifa(e.target.value)}
            />
            <button
              style={{ ...btnPrimary, width: "100%", marginTop: "10px" }}
              onClick={guardarRifa}
            >
              {editarId ? "Actualizar" : "Crear"}
            </button>
          </div>
        </div>
      )}

      {/* Modal Buscar Usuario */}
      {modalUsuario && (
        <div style={modalStyle} onClick={() => setModalUsuario(false)}>
          <div style={modalContent} onClick={(e) => e.stopPropagation()}>
            <h3>Buscar Usuario</h3>
            <input
              placeholder="Correo o teléfono"
              style={{ width: "100%", padding: "8px", margin: "5px 0" }}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
            <button
              style={{ ...btnPrimary, width: "100%", marginTop: 5 }}
              onClick={buscarUsuario}
            >
              Buscar
            </button>

            {userResult && (
              <div style={{ marginTop: 10 }}>
                <p>
                  <b>{userResult.nombre}</b> ({userResult.correo || userResult.telefono})
                </p>
                <p>Saldo: ${userResult.saldo || 0}</p>
                <input
                  type="number"
                  placeholder="Otro monto"
                  style={{ width: "100%", padding: 8, margin: "5px 0" }}
                  value={montoCustom}
                  onChange={(e) => setMontoCustom(e.target.value)}
                />
                <button
                  style={{ ...btnPrimary, width: "100%" }}
                  onClick={() => recargar(userResult.id, Number(montoCustom))}
                >
                  Recargar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Subir Publicidad */}
      {modalPublicidad && (
        <div style={modalStyle} onClick={() => setModalPublicidad(false)}>
          <div style={modalContent} onClick={(e) => e.stopPropagation()}>
            <h3>Subir Publicidad</h3>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPublicidadFile(e.target.files[0])}
            />
            <button
              style={{ ...btnPrimary, width: "100%", marginTop: 10 }}
              onClick={subirPublicidad}
            >
              Subir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}




