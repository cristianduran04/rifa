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
  const [publicidad, setPublicidad] = useState(null);
  const [publicidadFutura, setPublicidadFutura] = useState(null);

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

      // Suscribirse a números de cada rifa
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

  // Escuchar publicidad actual
  useEffect(() => {
    const ref = collection(db, "publicidad");
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.empty) {
        setPublicidad(snap.docs[0].data()); // primera publicidad activa
      }
    });
    return () => unsub();
  }, []);

  // Escuchar publicidad futura
  useEffect(() => {
    const ref = doc(db, "publicidad", "futura");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setPublicidadFutura(snap.data());
    });
    return () => unsub();
  }, []);

  // Comprar número
  const comprarNumero = async (rifa, numero) => {
    if (!usuarioData) return;
    if ((usuarioData.saldo || 0) < rifa.precioNumero) {
      alert("No tienes saldo suficiente");
      return;
    }

    const numRef = doc(db, "rifas", rifa.id, "numeros", numero);
    await updateDoc(numRef, { status: "taken", usuario: auth.currentUser.uid });

    const userRef = doc(db, "usuarios", auth.currentUser.uid);
    await updateDoc(userRef, {
      saldo: usuarioData.saldo - rifa.precioNumero,
    });

    alert(`✅ Compraste el número ${numero}`);
  };

  return (
    <div>
      <Navbar nombre="🎟️ Usuario" />

      {/* 🔹 Publicidad futura */}
      {publicidadFutura && (
        <div
          style={{
            margin: "10px",
            borderRadius: "10px",
            overflow: "hidden",
            maxHeight: "150px",
            textAlign: "center",
            background: "#f0f0f0",
          }}
        >
          <img
            src={publicidadFutura.imagen}
            alt="Publicidad futura"
            style={{
              width: "100%",
              maxWidth: "400px",
              height: "150px",
              objectFit: "cover",
              borderRadius: "8px",
            }}
          />
        </div>
      )}

      
      <div style={{ padding: 10 }}>
        {usuarioData && (
          <p style={{ fontSize: "16px", fontWeight: "bold" }}>
            Saldo: ${usuarioData.saldo || 0}
          </p>
        )}

        {rifas.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {rifas.map((rifa) => {
              const numerosTomados = numeros[rifa.id]?.filter(
                (n) => n.status === "taken"
              ).length || 0;
              const disponibles = 100 - numerosTomados;

              return (
                <div
                  key={rifa.id}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "12px",
                    padding: "10px",
                    background: "#fff",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                  }}
                  onClick={() =>
                    setExpanded(expanded === rifa.id ? null : rifa.id)
                  }
                >
                  {/* 📌 Vista resumida */}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {rifa.foto && (
                      <img
                        src={rifa.foto}
                        alt="Rifa"
                        style={{
                          width: "60px",
                          height: "60px",
                          borderRadius: "8px",
                          objectFit: "cover",
                        }}
                      />
                    )}
                    <div>
                      <h3 style={{ margin: 0, fontSize: "16px" }}>{rifa.titulo}</h3>
                      <p style={{ margin: "2px 0", fontSize: "14px", color: "#555" }}>
                        Precio: ${rifa.precioNumero}
                      </p>
                      <p style={{ margin: "2px 0", fontSize: "14px", color: "#555" }}>
                        Ganancia: ${rifa.gananciaEsperada || 0}
                      </p>
                      <p style={{ margin: "2px 0", fontSize: "14px", color: "#555" }}>
                        Disponibles: {disponibles} / 100
                      </p>
                    </div>
                  </div>

                  {/* 🔽 Expandido */}
                  {expanded === rifa.id && (
                    <div style={{ marginTop: "10px" }}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(5, 1fr)",
                          gap: "6px",
                        }}
                      >
                        {Array.from({ length: 100 }, (_, i) =>
                          String(i).padStart(2, "0")
                        ).map((num) => {
                          const ocupado = numeros[rifa.id]?.find(
                            (n) => n.id === num && n.status === "taken"
                          );
                          return (
                            <button
                              key={num}
                              onClick={(e) => {
                                e.stopPropagation();
                                comprarNumero(rifa, num);
                              }}
                              disabled={!!ocupado}
                              style={{
                                padding: "8px",
                                borderRadius: "6px",
                                border: "1px solid #ccc",
                                fontSize: "12px",
                                background: ocupado ? "#ccc" : "#4caf50",
                                color: "white",
                                fontWeight: "bold",
                                cursor: ocupado ? "not-allowed" : "pointer",
                              }}
                            >
                              {num}
                            </button>
                          );
                        })}
                      </div>
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
    </div>
  );
}

