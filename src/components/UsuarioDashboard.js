// src/components/UsuarioDashboard.js
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import Navbar from "./Navbar";

export default function UsuarioDashboard() {
  const [usuarioData, setUsuarioData] = useState(null);
  const [rifas, setRifas] = useState([]);
  const [numeros, setNumeros] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [publicidadFutura, setPublicidadFutura] = useState(null);
  const [seleccionados, setSeleccionados] = useState({}); // { rifaId: [numeros] }

  // Escuchar usuario
  useEffect(() => {
    if (!auth.currentUser) return;
    const ref = doc(db, "usuarios", auth.currentUser.uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setUsuarioData(snap.data());
    });
    return () => unsub();
  }, []);

  // Escuchar rifas activas
  useEffect(() => {
    const q = query(collection(db, "rifas"), where("estado", "==", "activa"));
    const fetch = async () => {
      const snap = await getDocs(q);
      const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRifas(lista);

      lista.forEach((rifa) => {
        const ref = collection(db, "rifas", rifa.id, "numeros");
        const unsub = onSnapshot(ref, (s) => {
          setNumeros((prev) => ({
            ...prev,
            [rifa.id]: s.docs.map((d) => ({ id: d.id, ...d.data() })),
          }));
        });
        return () => unsub();
      });
    };
    fetch();
  }, []);

  // Escuchar publicidad futura
  useEffect(() => {
    const ref = doc(db, "publicidad", "futura");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setPublicidadFutura(snap.data());
    });
    return () => unsub();
  }, []);

  // Seleccionar / deseleccionar número
  const toggleNumero = (rifaId, numero) => {
    setSeleccionados((prev) => {
      const prevNums = prev[rifaId] || [];
      if (prevNums.includes(numero)) {
        return { ...prev, [rifaId]: prevNums.filter((n) => n !== numero) };
      } else {
        return { ...prev, [rifaId]: [...prevNums, numero] };
      }
    });
  };

  // Comprar todos los seleccionados
  const pagarSeleccionados = async () => {
    if (!usuarioData) return;
    let total = 0;

    Object.keys(seleccionados).forEach((rifaId) => {
      const rifa = rifas.find((r) => r.id === rifaId);
      if (!rifa) return;
      total += rifa.precioNumero * seleccionados[rifaId].length;
    });

    if (total > (usuarioData.saldo || 0)) {
      alert("No tienes saldo suficiente para estos números");
      return;
    }

    for (const rifaId of Object.keys(seleccionados)) {
      const rifa = rifas.find((r) => r.id === rifaId);
      if (!rifa) continue;
      for (const num of seleccionados[rifaId]) {
        const numRef = doc(db, "rifas", rifaId, "numeros", num);
        await updateDoc(numRef, { status: "taken", usuario: auth.currentUser.uid });
      }
    }

    const userRef = doc(db, "usuarios", auth.currentUser.uid);
    await updateDoc(userRef, { saldo: usuarioData.saldo - total });

    alert(`✅ Compraste ${total} en números`);
    setSeleccionados({});
  };

  // ===== CSS =====
  const styles = {
    container: { padding: "15px", maxWidth: "900px", margin: "0 auto" },
    saldo: {
      fontSize: "18px",
      fontWeight: "bold",
      marginBottom: "15px",
      textAlign: "right",
      color: "#1976d2",
    },
    rifaCard: {
      border: "1px solid #ddd",
      borderRadius: "12px",
      padding: "15px",
      background: "#fff",
      boxShadow: "0 3px 8px rgba(0,0,0,0.08)",
      cursor: "pointer",
      transition: "transform 0.2s",
    },
    rifaCardHover: { transform: "scale(1.01)" },
    rifaHeader: { display: "flex", alignItems: "center", gap: "15px" },
    rifaInfo: { flex: 1 },
    rifaFoto: { width: "70px", height: "70px", borderRadius: "8px", objectFit: "cover" },
    rifaTitulo: { margin: 0, fontSize: "17px", fontWeight: "bold", color: "#333" },
    rifaText: { margin: "3px 0", fontSize: "14px", color: "#555" },
    numerosGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(5, 1fr)",
      gap: "6px",
      marginTop: "10px",
    },
    numeroBtn: {
      padding: "8px",
      borderRadius: "6px",
      border: "1px solid #ccc",
      fontSize: "13px",
      fontWeight: "bold",
      color: "white",
      cursor: "pointer",
    },
    pagarBtn: {
      marginTop: "10px",
      padding: "8px 12px",
      background: "#1976d2",
      color: "white",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
    },
    publicidad: {
      margin: "10px 0",
      borderRadius: "10px",
      overflow: "hidden",
      textAlign: "center",
      background: "#f0f0f0",
      maxHeight: "150px",
    },
    publicidadImg: {
      width: "100%",
      maxWidth: "400px",
      height: "150px",
      objectFit: "cover",
      borderRadius: "8px",
    },
    finRifa: { margin: "3px 0", fontSize: "13px", color: "red", fontWeight: "bold" },
  };

  return (
    <div style={styles.container}>
      <Navbar nombre="🎟️ Usuario" />

      {/* Publicidad futura */}
      {publicidadFutura && (
        <div style={styles.publicidad}>
          <img src={publicidadFutura.imagen} alt="Publicidad futura" style={styles.publicidadImg} />
        </div>
      )}

      {/* Saldo */}
      {usuarioData && <div style={styles.saldo}>Saldo: ${usuarioData.saldo || 0}</div>}

      {/* Rifas */}
      {rifas.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {rifas.map((rifa) => {
            const numerosTomados = numeros[rifa.id]?.filter((n) => n.status === "taken").length || 0;
            const disponibles = 100 - numerosTomados;
            const finRifa = rifa.fin ? rifa.fin.toDate() : null;
            const rifaTerminada = finRifa && new Date() > finRifa;

            return (
              <div
                key={rifa.id}
                style={styles.rifaCard}
                onClick={() => setExpanded(expanded === rifa.id ? null : rifa.id)}
              >
                <div style={styles.rifaHeader}>
                  {rifa.foto && <img src={rifa.foto} alt="Rifa" style={styles.rifaFoto} />}
                  <div style={styles.rifaInfo}>
                    <h3 style={styles.rifaTitulo}>{rifa.titulo}</h3>
                    <p style={styles.rifaText}>Precio: ${rifa.precioNumero}</p>
                    <p style={styles.rifaText}>Premio Rifa: ${rifa.gananciaEsperada || 0}</p>
                    <p style={styles.rifaText}>Disponibles: {disponibles} / 100</p>
                    {rifa.fin && <p style={styles.rifaText}>Fin de la rifa: {rifa.fin.toDate().toLocaleString()}</p>}
                    {rifaTerminada && <p style={styles.finRifa}>Rifa finalizada</p>}
                  </div>
                </div>

                {/* Expandido */}
                {expanded === rifa.id && !rifaTerminada && (
                  <div style={styles.numerosGrid}>
                    {Array.from({ length: 100 }, (_, i) => String(i).padStart(2, "0")).map((num) => {
                      const ocupado = numeros[rifa.id]?.find((n) => n.id === num && n.status === "taken");
                      const seleccionado = seleccionados[rifa.id]?.includes(num);
                      return (
                        <button
                          key={num}
                          onClick={(e) => { e.stopPropagation(); toggleNumero(rifa.id, num); }}
                          disabled={!!ocupado}
                          style={{
                            ...styles.numeroBtn,
                            background: ocupado ? "#ccc" : seleccionado ? "#ff9800" : "#4caf50",
                            cursor: ocupado ? "not-allowed" : "pointer",
                          }}
                        >
                          {num}
                        </button>
                      );
                    })}
                    {seleccionados[rifa.id]?.length > 0 && (
                      <button style={styles.pagarBtn} onClick={pagarSeleccionados}>
                        Pagar {seleccionados[rifa.id].length} números
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p>No hay rifas activas</p>
      )}
    </div>
  );
}


