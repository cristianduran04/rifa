// src/components/UsuarioHome.js
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, getDoc, updateDoc, collection, getDocs, runTransaction, serverTimestamp } from "firebase/firestore";


const UID = "12345"; // Simulación de usuario logueado (usar auth/telefono real)

export default function UsuarioHome() {
  const [saldo, setSaldo] = useState(0);
  const [rifa, setRifa] = useState(null);
  const [numeros, setNumeros] = useState([]);

  useEffect(() => {
    const cargar = async () => {
      const userSnap = await getDoc(doc(db, "usuarios", UID));
      if (userSnap.exists()) setSaldo(userSnap.data().saldo);

      // Solo hay 1 rifa activa
      const rifasSnap = await getDocs(collection(db, "rifas"));
      const activa = rifasSnap.docs.find(r => r.data().estado === "activa");
      if (activa) {
        setRifa({ id: activa.id, ...activa.data() });

        // cargar números
        const numsSnap = await getDocs(collection(db, "rifas", activa.id, "numeros"));
        setNumeros(numsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    };
    cargar();
  }, []);

  const comprar = async (numero) => {
    if (!rifa) return;
    const numeroRef = doc(db, "rifas", rifa.id, "numeros", String(numero));
    const userRef = doc(db, "usuarios", UID);

    try {
      await runTransaction(db, async (t) => {
        const numSnap = await t.get(numeroRef);
        const userSnap = await t.get(userRef);
        if (!numSnap.exists() || !userSnap.exists()) throw new Error("Error");

        const numData = numSnap.data();
        const userData = userSnap.data();

        if (numData.status === "sold") throw new Error("Número ya vendido");
        if ((userData.saldo || 0) < rifa.precioNumero) throw new Error("Saldo insuficiente");

        t.update(userRef, { saldo: userData.saldo - rifa.precioNumero });
        t.update(numeroRef, {
          status: "sold",
          userId: UID,
          compradoAt: serverTimestamp()
        });
      });
      alert("Número comprado!");
      window.location.reload();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Saldo: ${saldo}</h2>
      {rifa ? (
        <>
          <h3>{rifa.titulo}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 5 }}>
            {numeros.map(n => (
              <button
                key={n.id}
                onClick={() => comprar(n.number)}
                style={{
                  background: n.status === "sold" ? "red" : "green",
                  color: "white",
                  padding: 10
                }}
                disabled={n.status === "sold"}
              >
                {n.number}
              </button>
            ))}
          </div>
        </>
      ) : <p>No hay rifa activa</p>}
    </div>
  );
}

