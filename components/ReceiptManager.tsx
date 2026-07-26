"use client";

import { useState, useEffect } from "react";
import { collection, doc, setDoc, getDoc, updateDoc, increment, serverTimestamp, runTransaction, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Plus, Trash2, FileText, Download, Save } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Product {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export default function ReceiptManager() {
  const [clientInfo, setClientInfo] = useState({
    name: "",
    document: "",
    phone: "",
    address: "",
    city: ""
  });

  const [products, setProducts] = useState<Product[]>([
    { id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0 }
  ]);
  
  const [savedProducts, setSavedProducts] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const fetchSavedProducts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'productos_recibos'));
        const pList: any[] = [];
        querySnapshot.forEach((doc) => {
          pList.push({ id: doc.id, ...doc.data() });
        });
        setSavedProducts(pList);
      } catch (e) {
        console.error("Error fetching saved products:", e);
      }
    };
    fetchSavedProducts();
  }, []);

  const handleClientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setClientInfo({ ...clientInfo, [e.target.name]: e.target.value });
  };

  const handleProductChange = (id: string, field: keyof Product, value: string | number) => {
    setProducts(products.map(p => {
      if (p.id === id) {
        const updated = { ...p, [field]: value };
        if (field === 'description') {
          const match = savedProducts.find(sp => sp.description.toLowerCase() === (value as string).toLowerCase());
          if (match) {
            updated.unitPrice = match.defaultPrice;
          }
        }
        return updated;
      }
      return p;
    }));
  };

  const addProduct = () => {
    setProducts([...products, { id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0 }]);
  };

  const removeProduct = (id: string) => {
    if (products.length > 1) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const calculateTotal = () => {
    return products.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice), 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
  };

  const generateReceiptNumber = async (): Promise<string> => {
    const counterRef = doc(db, "recibos_contador", "main");
    
    try {
      const nextId = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let newCount = 1;
        if (!counterDoc.exists()) {
          transaction.set(counterRef, { count: 1 });
        } else {
          newCount = counterDoc.data().count + 1;
          transaction.update(counterRef, { count: newCount });
        }
        return newCount;
      });
      
      return `RE-${nextId.toString().padStart(4, '0')}`;
    } catch (error) {
      console.error("Transaction failed: ", error);
      return `RE-TEMP-${Math.floor(Math.random() * 10000)}`;
    }
  };

  const generatePDF = async (receiptNum: string) => {
    const doc = new jsPDF();
    const total = calculateTotal();
    
    const azulCorporativo = [34, 42, 104];
    const rojoConectividad = [237, 28, 36];
    const grisPizarra = [80, 90, 100];
    const grisPlatino = [240, 242, 245];

    try {
      const logoResponse = await fetch("/logo.png");
      if (logoResponse.ok) {
        const blob = await logoResponse.blob();
        const reader = new FileReader();
        const logoBase64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        
        const img = new Image();
        img.src = logoBase64;
        await new Promise((resolve) => { img.onload = resolve; });
        const ratio = img.width / img.height;
        const newWidth = 20 * ratio;

        doc.addImage(logoBase64, 'PNG', 15, 15, newWidth, 20);
      }
    } catch (e) {
      console.error("No se pudo cargar el logo para el PDF", e);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(azulCorporativo[0], azulCorporativo[1], azulCorporativo[2]);
    doc.text("DC TELEMÁTICA", 200, 20, { align: "right" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(grisPizarra[0], grisPizarra[1], grisPizarra[2]);
    doc.text("Nit. 13.874.164-7", 200, 26, { align: "right" });
    doc.text("Cr. 16 No. 26 - 45 B. 6 de Octubre", 200, 31, { align: "right" });
    doc.text("Cel. 317 425 1419", 200, 36, { align: "right" });

    doc.setDrawColor(rojoConectividad[0], rojoConectividad[1], rojoConectividad[2]);
    doc.setLineWidth(1);
    doc.line(15, 42, 200, 42);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(azulCorporativo[0], azulCorporativo[1], azulCorporativo[2]);
    doc.text("RECIBO DE PAGO", 15, 55);
    
    doc.setFontSize(12);
    doc.setTextColor(rojoConectividad[0], rojoConectividad[1], rojoConectividad[2]);
    doc.text(`No. ${receiptNum}`, 15, 62);
    
    doc.setFontSize(10);
    doc.setTextColor(grisPizarra[0], grisPizarra[1], grisPizarra[2]);
    doc.setFont("helvetica", "normal");
    const dateStr = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Fecha: ${dateStr}`, 200, 55, { align: "right" });

    doc.setFillColor(grisPlatino[0], grisPlatino[1], grisPlatino[2]);
    doc.roundedRect(15, 68, 185, 32, 3, 3, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(azulCorporativo[0], azulCorporativo[1], azulCorporativo[2]);
    doc.text("DATOS DEL CLIENTE", 20, 75);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(grisPizarra[0], grisPizarra[1], grisPizarra[2]);
    doc.text(`Nombre/Razón Social: ${clientInfo.name}`, 20, 82);
    doc.text(`NIT/CC: ${clientInfo.document}`, 20, 88);
    doc.text(`Teléfono: ${clientInfo.phone}`, 20, 94);
    
    doc.text(`Dirección: ${clientInfo.address}`, 105, 82);
    doc.text(`Ciudad: ${clientInfo.city}`, 105, 88);

    const tableData = products.filter(p => p.description.trim() !== "").map(p => [
      p.description,
      p.quantity.toString(),
      formatCurrency(p.unitPrice),
      formatCurrency(p.quantity * p.unitPrice)
    ]);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(50);
    doc.setTextColor(245, 245, 245);
    doc.text("CANCELADO Y ENTREGADO", 105, 160, { align: "center", angle: 45 });

    autoTable(doc, {
      startY: 110,
      head: [['Descripción', 'Cantidad', 'Valor Unitario', 'Valor Total']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: azulCorporativo as [number, number, number],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 'auto' },
        1: { halign: 'center', cellWidth: 25 },
        2: { halign: 'right', cellWidth: 35 },
        3: { halign: 'right', cellWidth: 35 }
      },
      styles: {
        fontSize: 10,
        textColor: grisPizarra as [number, number, number],
        lineColor: [220, 220, 220],
      },
      alternateRowStyles: {
        fillColor: grisPlatino as [number, number, number]
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFillColor(azulCorporativo[0], azulCorporativo[1], azulCorporativo[2]);
    doc.rect(130, finalY, 70, 10, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL:", 135, finalY + 7);
    doc.text(formatCurrency(total), 195, finalY + 7, { align: "right" });

    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(grisPizarra[0], grisPizarra[1], grisPizarra[2]);
    doc.text("¡Gracias por su preferencia!", 105, finalY + 30, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Este documento es un comprobante de pago generado electrónicamente.", 105, finalY + 35, { align: "center" });
    doc.text("Válido sin firma ni sello.", 105, finalY + 39, { align: "center" });

    const securityCode = Math.random().toString(36).substring(2, 12).toUpperCase();
    doc.setFont("helvetica", "bold");
    doc.setTextColor(azulCorporativo[0], azulCorporativo[1], azulCorporativo[2]);
    doc.text(`CÓDIGO DE SEGURIDAD: ${securityCode}`, 105, finalY + 45, { align: "center" });

    doc.setDrawColor(azulCorporativo[0], azulCorporativo[1], azulCorporativo[2]);
    doc.setLineWidth(2);
    doc.line(15, 280, 140, 280);
    doc.setDrawColor(rojoConectividad[0], rojoConectividad[1], rojoConectividad[2]);
    doc.line(140, 280, 200, 280);

    doc.save(`${receiptNum}.pdf`);
  };

  const handleGenerate = async () => {
    if (!clientInfo.name || products.every(p => !p.description)) {
      alert("Por favor completa al menos el nombre del cliente y un producto.");
      return;
    }

    setIsGenerating(true);
    try {
      const receiptNum = await generateReceiptNumber();
      const total = calculateTotal();
      
      await addDoc(collection(db, 'recibos'), {
        receiptNumber: receiptNum,
        clientInfo,
        products: products.filter(p => p.description.trim() !== ""),
        total: total,
        createdAt: serverTimestamp()
      });

      for (const p of products) {
        if (p.description.trim() !== '') {
          const normalizedId = p.description.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
          try {
            await setDoc(doc(db, 'productos_recibos', normalizedId), {
              description: p.description.trim(),
              defaultPrice: p.unitPrice
            }, { merge: true });
          } catch (e) {
            console.error("Error saving product to catalog:", e);
          }
        }
      }

      await generatePDF(receiptNum);
      alert(`✅ Recibo ${receiptNum} generado y guardado exitosamente.`);
    } catch (error) {
      console.error("Error al generar el recibo:", error);
      alert("Hubo un error al guardar/generar el recibo.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-6 shadow-xl">
      <div className="flex items-center gap-3 mb-8 pb-4 border-b border-white/10">
        <div className="w-10 h-10 rounded-xl bg-[#222A68]/20 flex items-center justify-center border border-[#222A68]/40">
          <FileText className="text-[#06b6d4]" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Generador de Recibos</h2>
          <p className="text-gray-400 text-sm">Crea y descarga recibos de pago en PDF para tus clientes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <h3 className="text-lg font-bold text-[#06b6d4] mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ED1C24]" />
              Datos del Cliente
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">Nombre / Razón Social *</label>
                <input 
                  type="text" name="name" value={clientInfo.name} onChange={handleClientChange}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:border-[#06b6d4] outline-none transition-colors" 
                  placeholder="Ej. Juan Pérez" required 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">NIT / CC</label>
                <input 
                  type="text" name="document" value={clientInfo.document} onChange={handleClientChange}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:border-[#06b6d4] outline-none transition-colors" 
                  placeholder="Ej. 123456789" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">Teléfono</label>
                <input 
                  type="text" name="phone" value={clientInfo.phone} onChange={handleClientChange}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:border-[#06b6d4] outline-none transition-colors" 
                  placeholder="Ej. 300 123 4567" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">Dirección y Ciudad</label>
                <div className="flex gap-2">
                  <input 
                    type="text" name="address" value={clientInfo.address} onChange={handleClientChange}
                    className="w-2/3 bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:border-[#06b6d4] outline-none transition-colors" 
                    placeholder="Dirección" 
                  />
                  <input 
                    type="text" name="city" value={clientInfo.city} onChange={handleClientChange}
                    className="w-1/3 bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:border-[#06b6d4] outline-none transition-colors" 
                    placeholder="Ciudad" 
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-[#06b6d4] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#ED1C24]" />
                Detalle de Compra
              </h3>
              <button 
                onClick={addProduct}
                className="bg-[#222A68]/30 hover:bg-[#222A68]/60 text-white border border-[#222A68]/50 px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center transition-colors"
              >
                <Plus size={16} className="mr-1" /> Añadir Fila
              </button>
            </div>

            <div className="space-y-3">
              <div className="hidden md:grid grid-cols-12 gap-3 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <div className="col-span-5">Descripción del Ítem</div>
                <div className="col-span-2 text-center">Cant.</div>
                <div className="col-span-2 text-right">Vr. Unitario</div>
                <div className="col-span-2 text-right">Vr. Total</div>
                <div className="col-span-1"></div>
              </div>

              {products.map((product, index) => (
                <div key={product.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-black/30 p-3 md:p-2 rounded-lg border border-white/5 relative group">
                  <div className="md:hidden flex justify-between items-center mb-2 pb-2 border-b border-white/5">
                    <span className="text-xs font-bold text-[#06b6d4]">ÍTEM {index + 1}</span>
                    <button onClick={() => removeProduct(product.id)} className="text-red-400 p-1 bg-red-400/10 rounded"><Trash2 size={14}/></button>
                  </div>

                  <div className="col-span-1 md:col-span-5">
                    <input 
                      type="text" 
                      value={product.description} 
                      onChange={(e) => handleProductChange(product.id, 'description', e.target.value)}
                      className="w-full bg-white/5 border border-transparent hover:border-white/20 focus:border-[#06b6d4] focus:bg-black/60 rounded px-3 py-2 text-sm text-white outline-none transition-all"
                      placeholder="Nombre del producto o servicio"
                      list="saved-products-list"
                    />
                  </div>
                  
                  <div className="col-span-1 md:col-span-2 flex items-center gap-2">
                    <span className="md:hidden text-xs text-gray-500 w-20">Cantidad:</span>
                    <input 
                      type="number" min="1"
                      value={product.quantity} 
                      onChange={(e) => handleProductChange(product.id, 'quantity', parseInt(e.target.value) || 0)}
                      className="w-full bg-white/5 border border-transparent hover:border-white/20 focus:border-[#06b6d4] focus:bg-black/60 rounded px-3 py-2 text-sm text-white text-center outline-none transition-all"
                    />
                  </div>
                  
                  <div className="col-span-1 md:col-span-2 flex items-center gap-2">
                    <span className="md:hidden text-xs text-gray-500 w-20">Vr. Unit:</span>
                    <input 
                      type="number" min="0" step="100"
                      value={product.unitPrice} 
                      onChange={(e) => handleProductChange(product.id, 'unitPrice', parseInt(e.target.value) || 0)}
                      className="w-full bg-white/5 border border-transparent hover:border-white/20 focus:border-[#06b6d4] focus:bg-black/60 rounded px-3 py-2 text-sm text-white text-right outline-none transition-all"
                    />
                  </div>
                  
                  <div className="col-span-1 md:col-span-2 text-right font-bold text-cyan-200">
                    <span className="md:hidden text-xs text-gray-500 float-left font-normal w-20">Total:</span>
                    {formatCurrency(product.quantity * product.unitPrice)}
                  </div>
                  
                  <div className="hidden md:flex col-span-1 justify-center">
                    <button 
                      onClick={() => removeProduct(product.id)}
                      className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                      title="Eliminar fila"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-[#222A68]/10 border border-[#222A68]/30 rounded-xl p-6 sticky top-6">
            <h3 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">Resumen</h3>
            
            <div className="flex justify-between items-center mb-3 text-gray-300">
              <span>Subtotal:</span>
              <span className="font-medium">{formatCurrency(calculateTotal())}</span>
            </div>
            
            <div className="flex justify-between items-center mb-6 pb-6 border-b border-white/10 text-gray-300">
              <span>Impuestos (0%):</span>
              <span className="font-medium">$0</span>
            </div>
            
            <div className="flex justify-between items-center mb-8">
              <span className="text-lg font-bold text-white">TOTAL:</span>
              <span className="text-2xl font-black text-[#06b6d4]">{formatCurrency(calculateTotal())}</span>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-[#222A68] to-[#1a1f4c] hover:from-[#2a3482] hover:to-[#222A68] text-white border border-[#222A68]/50 shadow-[0_0_20px_rgba(34,42,104,0.3)] font-bold py-4 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>⏳ Generando...</>
              ) : (
                <>
                  <Download size={20} /> Generar y Descargar PDF
                </>
              )}
            </button>
            <p className="text-center text-xs text-gray-500 mt-4">
              Al generar, se asignará un número de recibo (ej. RE-001) y quedará guardado en la nube de DC Telemática.
            </p>
          </div>
        </div>

      </div>
      
      <datalist id="saved-products-list">
        {savedProducts.map(sp => (
          <option key={sp.id} value={sp.description} />
        ))}
      </datalist>
    </div>
  );
}
