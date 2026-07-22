"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { initializeApp, getApps } from "firebase/app";
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword, getAuth, sendPasswordResetEmail } from "firebase/auth";
import { collection, onSnapshot, doc, deleteDoc, updateDoc, query, orderBy, setDoc, addDoc, limit } from "firebase/firestore";
import { auth, db, firebaseConfig } from "@/lib/firebase";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import RackBuilder from "@/components/RackBuilder";
interface Inspeccion {
  id: string;
  registro_num?: string;
  fecha_hora?: string;
  tecnico_email?: string; 
  tecnico_nombre?: string; // Nuevo campo para guardar el nombre del técnico
  punto_id?: string;
  ubicacion?: string;
  switch_port?: string;
  foto_1_base64?: string;
  foto_2_base64?: string;
  foto_3_base64?: string;
  solicitud_modificacion?: "Pendiente" | "Aprobada" | "Rechazada";
  motivo_modificacion?: string;
  [key: string]: any; 
}

// Función de sanitización para prevenir inyección XSS básica
const sanitizeInput = (str: string) => {
  if (typeof str !== 'string') return str;
  return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
};

export default function PanelPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  
  // Tabs Navigation
  const [activeTab, setActiveTab] = useState<"auditorias" | "usuarios" | "cms" | "dispositivos" | "gabinetes" | "tareas">("auditorias");
  const [currentUserRole, setCurrentUserRole] = useState<string>("tecnico");

  // State Auditorias
  const [inspecciones, setInspecciones] = useState<Inspeccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [viewDoc, setViewDoc] = useState<Inspeccion | null>(null);
  const [editDoc, setEditDoc] = useState<Inspeccion | null>(null);

  // State Usuarios
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState(""); // Nuevo estado para el Nombre
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("tecnico");
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  
  // Edit User State
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editUserDoc, setEditUserDoc] = useState<any>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserRole, setEditUserRole] = useState("");

  // State CMS Web
  const [webServices, setWebServices] = useState<any[]>([]);
  const [webProjects, setWebProjects] = useState<any[]>([]);
  const [cmsContent, setCmsContent] = useState<any>({});
  type CmsTabType = "servicios" | "proyectos" | "hero" | "about" | "contact" | "global";
  const [cmsSubTab, setCmsSubTab] = useState<CmsTabType>("servicios");
  const [showCmsModal, setShowCmsModal] = useState(false);
  const [cmsEditDoc, setCmsEditDoc] = useState<any>(null);

  // State Dispositivos de Red
  const [dispositivos, setDispositivos] = useState<any[]>([]);
  const [loadingDispositivos, setLoadingDispositivos] = useState(true);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [editDeviceDoc, setEditDeviceDoc] = useState<any>(null);
  
  const [deviceForm, setDeviceForm] = useState({
    tipo: "Switch",
    nombre: "",
    ip: "",
    marca: "",
    modelo: "",
    mac: "",
    unidadesU: 1,
    mapCoords: null as { x: number, y: number } | null
  });
  const [isSavingDevice, setIsSavingDevice] = useState(false);
  
  // Estado para el plano de ubicación del dispositivo
  const [showMapModal, setShowMapModal] = useState(false);

  // State Gabinetes (Rack Builder)
  const [gabinetes, setGabinetes] = useState<any[]>([]);
  const [loadingGabinetes, setLoadingGabinetes] = useState(true);
  const [showGabineteModal, setShowGabineteModal] = useState(false);
  const [gabineteForm, setGabineteForm] = useState({
    nombre: "",
    ubicacion: "",
    unidades: 42
  });
  const [activeGabinete, setActiveGabinete] = useState<any>(null); // Rack en edición visual

  // State Tareas Diarias
  const [tareas, setTareas] = useState<any[]>([]);
  const [loadingTareas, setLoadingTareas] = useState(true);
  const [showTareaModal, setShowTareaModal] = useState(false);
  const [tareaForm, setTareaForm] = useState({ titulo: "", descripcion: "", asignado_a: "Todos", importancia: "Media", fecha_programada: "" });
  const [isSavingTarea, setIsSavingTarea] = useState(false);
  const [viewEvidenciaTarea, setViewEvidenciaTarea] = useState<any>(null);
  const [showAbonoMasivoModal, setShowAbonoMasivoModal] = useState(false);
  const [abonoMasivoAmount, setAbonoMasivoAmount] = useState("");
  const [isProcessingAbono, setIsProcessingAbono] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) router.push("/");
    });

    // Cargar Auditorías: Límite inteligente anti-colapso de RAM en móviles
    const isMobile = window.innerWidth < 1024;
    const qAuditorias = isMobile 
      ? query(collection(db, "inspecciones"), orderBy("timestamp", "desc"), limit(100))
      : query(collection(db, "inspecciones"), orderBy("timestamp", "desc"));

    const unsubscribeDb = onSnapshot(qAuditorias, (snapshot) => {
      const docs: Inspeccion[] = [];
      snapshot.forEach((doc) => { docs.push({ id: doc.id, ...doc.data() }); });
      setInspecciones(docs);
      setLoading(false);
    }, (error) => {
      console.error("Error cargando inspecciones:", error);
      alert(`Error cargando auditorías: ${error.message}`);
      setLoading(false);
    });

    // Cargar Usuarios (sin orderBy en Firebase para que no oculte los que no tienen createdAt)
    const qUsers = query(collection(db, "usuarios"));
    const unsubscribeUsers = onSnapshot(qUsers, async (snapshot) => {
      const usersList: any[] = [];
      snapshot.forEach((doc) => { usersList.push({ id: doc.id, ...doc.data() }); });
      
      // Sort client-side
      usersList.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      
      setUsuarios(usersList);
      setLoadingUsers(false);
      
      // Update current user role
      if (auth.currentUser) {
        const currentUserEmail = auth.currentUser.email;
        const currentUserDoc = usersList.find(u => u.email === currentUserEmail);
        
        if (currentUserDoc) {
          setCurrentUserRole(currentUserDoc.role);
        } else if (currentUserEmail === 'ing.davidc@gmail.com') {
          // Auto-registro del admin principal en Firestore si se borró accidentalmente
          setCurrentUserRole('ingeniero');
          try {
            await setDoc(doc(db, "usuarios", currentUserEmail), {
              nombre: "David (Admin Principal)",
              email: currentUserEmail,
              role: "ingeniero",
              createdAt: new Date().toISOString()
            });
            console.log("Usuario admin principal auto-registrado en Firestore.");
          } catch (e) {
            console.error("No se pudo auto-registrar al admin principal", e);
          }
        }
      }
    }, (error) => {
      console.error("Error cargando usuarios:", error);
      setLoadingUsers(false);
    });

    // Cargar Servicios Web
    const qServices = query(collection(db, "web_services"));
    const unsubscribeServices = onSnapshot(qServices, (snapshot) => {
      const docs: any[] = [];
      snapshot.forEach((doc) => { docs.push({ id: doc.id, ...doc.data() }); });
      setWebServices(docs);
    }, (error) => {
      console.error("Error cargando web_services:", error);
    });

    // Cargar Proyectos Web
    const qProjects = query(collection(db, "web_projects"));
    const unsubscribeProjects = onSnapshot(qProjects, (snapshot) => {
      const docs: any[] = [];
      snapshot.forEach((doc) => { docs.push({ id: doc.id, ...doc.data() }); });
      setWebProjects(docs);
    }, (error) => {
      console.error("Error cargando web_projects:", error);
    });

    // Cargar Web Content Modular
    const qContent = query(collection(db, "web_content"));
    const unsubscribeContent = onSnapshot(qContent, (snapshot) => {
      const contentData: any = {};
      snapshot.forEach((doc) => { contentData[doc.id] = doc.data(); });
      setCmsContent(contentData);
    }, (error) => {
      console.error("Error cargando web_content:", error);
    });

    // Cargar Dispositivos de Red
    const qDispositivos = query(collection(db, "dispositivos_red"), orderBy("nombre", "asc"));
    const unsubscribeDispositivos = onSnapshot(qDispositivos, (snapshot) => {
      const docs: any[] = [];
      snapshot.forEach((doc) => { docs.push({ id: doc.id, ...doc.data() }); });
      setDispositivos(docs);
      setLoadingDispositivos(false);
    }, (error) => {
      console.error("Error cargando dispositivos_red:", error);
    });

    // Cargar Gabinetes
    const qGabinetes = query(collection(db, "gabinetes"));
    const unsubscribeGabinetes = onSnapshot(qGabinetes, (snapshot) => {
      const docs: any[] = [];
      snapshot.forEach((doc) => { docs.push({ id: doc.id, ...doc.data() }); });
      setGabinetes(docs);
      setLoadingGabinetes(false);
      
      // Update active gabinete if it was modified
      setActiveGabinete((prev: any) => {
        if (!prev) return prev;
        const updated = docs.find(d => d.id === prev.id);
        return updated || null;
      });
    }, (error) => {
      console.error("Error cargando gabinetes:", error);
      setLoadingGabinetes(false);
    });

    // Cargar Tareas
    const qTareas = query(collection(db, "tareas_diarias"), orderBy("fecha_creacion", "desc"));
    const unsubscribeTareas = onSnapshot(qTareas, (snapshot) => {
      const docs: any[] = [];
      snapshot.forEach((doc) => { docs.push({ id: doc.id, ...doc.data() }); });
      setTareas(docs);
      setLoadingTareas(false);
    }, (error) => {
      console.error("Error cargando tareas:", error);
      setLoadingTareas(false);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeDb();
      unsubscribeUsers();
      unsubscribeServices();
      unsubscribeProjects();
      unsubscribeContent();
      unsubscribeDispositivos();
      unsubscribeGabinetes();
      unsubscribeTareas();
    };
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  // ========================================================
  // CONTROL DE TAREAS DIARIAS
  // ========================================================
  const handleSaveTarea = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingTarea(true);
    try {
      await addDoc(collection(db, "tareas_diarias"), {
        ...tareaForm,
        fecha_programada: new Date().toISOString(),
        estado: "Pendiente",
        estado_pago: "Se debe",
        fecha_creacion: new Date().toISOString(),
        creado_por: auth.currentUser?.email || ""
      });
      alert("✅ Tarea asignada con éxito.");
      setShowTareaModal(false);
      setTareaForm({ titulo: "", descripcion: "", asignado_a: "Todos", importancia: "Media", fecha_programada: "" });
    } catch (error) {
      console.error("Error creando tarea:", error);
      alert("Error al asignar la tarea.");
    } finally {
      setIsSavingTarea(false);
    }
  };

  const handleAbonoMasivo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!abonoMasivoAmount || isNaN(Number(abonoMasivoAmount.replace(/\D/g, '')))) {
      alert("Ingrese un monto válido.");
      return;
    }

    setIsProcessingAbono(true);
    try {
      let remainingAbono = Number(abonoMasivoAmount.replace(/\D/g, ''));
      
      // Filter tasks that have pending balances and sort by oldest first
      const pendingTasks = tareas
        .filter(t => t.estado_pago === 'Se debe' || t.estado_pago === 'Abonado')
        .sort((a, b) => new Date(a.fecha_creacion).getTime() - new Date(b.fecha_creacion).getTime());

      for (const t of pendingTasks) {
        if (remainingAbono <= 0) break;

        const valorTotal = Number(String(t.valor_total || '0').replace(/\D/g, ''));
        const valorAbonadoAnteriormente = Number(String(t.valor_abono || '0').replace(/\D/g, ''));
        
        const deuda = valorTotal - valorAbonadoAnteriormente;
        if (deuda <= 0) continue; // Should not happen, but just in case

        if (remainingAbono >= deuda) {
          // Pay completely
          remainingAbono -= deuda;
          await updateDoc(doc(db, "tareas_diarias", t.id), {
            estado_pago: 'Pago totalmente',
            valor_abono: String(valorTotal),
            fecha_pago_total: new Date().toISOString()
          });
        } else {
          // Partial payment (abono)
          const nuevoAbono = valorAbonadoAnteriormente + remainingAbono;
          await updateDoc(doc(db, "tareas_diarias", t.id), {
            estado_pago: 'Abonado',
            valor_abono: String(nuevoAbono)
          });
          remainingAbono = 0;
        }
      }

      alert("✅ Abono masivo procesado con éxito.");
      setShowAbonoMasivoModal(false);
      setAbonoMasivoAmount("");
    } catch (error) {
      console.error("Error al procesar abono masivo:", error);
      alert("Error procesando abono masivo.");
    } finally {
      setIsProcessingAbono(false);
    }
  };

  const handleUpdatePagoTarea = async (id: string, nuevoEstadoPago: string) => {
    try {
      const updateData: any = { estado_pago: nuevoEstadoPago };
      if (nuevoEstadoPago === 'Pago totalmente') {
        updateData.fecha_pago_total = new Date().toISOString();
      }
      await updateDoc(doc(db, "tareas_diarias", id), updateData);
    } catch (error) {
      console.error("Error actualizando estado de pago:", error);
      alert("Error al actualizar el pago.");
    }
  };

  const handleDeleteTarea = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar esta tarea?")) {
      try {
        await deleteDoc(doc(db, "tareas_diarias", id));
      } catch (error) {
        console.error("Error eliminando tarea:", error);
      }
    }
  };

  // ========================================================
  // CONTROL DE USUARIOS
  // ========================================================
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUser(true);
    try {
      // Usamos una "SecondaryApp" para que al crear un usuario en Firebase Auth 
      // no cierre tu propia sesión actual de administrador.
      let secondaryApp = getApps().find(a => a.name === "SecondaryApp");
      if (!secondaryApp) {
        secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
      }
      const secondaryAuth = getAuth(secondaryApp);
      
      // Creamos en Auth
      await createUserWithEmailAndPassword(secondaryAuth, newUserEmail, newUserPassword);
      await signOut(secondaryAuth); // Deslogueamos la instancia secundaria por seguridad

      // Guardamos su rol y NOMBRE en Firestore para darle el acceso en el login
      await setDoc(doc(db, "usuarios", newUserEmail), {
        nombre: newUserName, // Guardamos el nombre y apellido
        email: newUserEmail,
        role: newUserRole,
        createdAt: new Date().toISOString()
      });

      setShowUserModal(false);
      setNewUserName(""); // Limpiamos el campo
      setNewUserEmail("");
      setNewUserPassword("");
      alert("✅ Usuario de acceso corporativo creado exitosamente");
    } catch (error: any) {
      console.error("Error creando usuario:", error);
      alert("Error al crear usuario. Posiblemente el correo ya está registrado o la contraseña es muy débil (mínimo 6 caracteres).");
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = async (emailToDelete: string) => {
    if (window.confirm("⚠️ ¿Estás seguro de revocar el acceso a este usuario? Ya no podrá ingresar al sistema.")) {
      try {
        await deleteDoc(doc(db, "usuarios", emailToDelete));
        alert("✅ Acceso revocado correctamente.");
      } catch (error) {
        console.error("Error eliminando usuario:", error);
        alert("Hubo un error al eliminar el usuario.");
      }
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserDoc) return;
    try {
      await updateDoc(doc(db, "usuarios", editUserDoc.email), {
        nombre: editUserName,
        role: editUserRole,
      });
      setShowEditUserModal(false);
      alert("✅ Usuario actualizado correctamente.");
    } catch (error) {
      console.error("Error actualizando usuario:", error);
      alert("Hubo un error al actualizar el usuario.");
    }
  };

  const handleSendPasswordReset = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      alert(`✅ Se ha enviado un enlace de recuperación de contraseña a ${email}`);
    } catch (error: any) {
      console.error("Error enviando reset de password:", error);
      alert("No se pudo enviar el enlace. Posiblemente el usuario ya no existe en el sistema de autenticación.");
    }
  };

  // ========================================================
  // CONTROL DE INVENTARIO DE RED
  // ========================================================
  const handleSaveDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDevice(true);
    try {
      if (editDeviceDoc) {
        // Actualizar
        await updateDoc(doc(db, "dispositivos_red", editDeviceDoc.id), {
          ...deviceForm
        });
        alert("✅ Dispositivo actualizado correctamente.");
      } else {
        // Crear nuevo
        const devId = deviceForm.nombre.toUpperCase().replace(/\s+/g, "_") + "_" + Date.now().toString().slice(-4);
        await setDoc(doc(db, "dispositivos_red", devId), {
          ...deviceForm,
          createdAt: new Date().toISOString()
        });
        alert("✅ Dispositivo agregado al inventario.");
      }
      setShowDeviceModal(false);
      setDeviceForm({ tipo: "Switch", nombre: "", ip: "", marca: "", modelo: "", mac: "", unidadesU: 1, mapCoords: null });
      setEditDeviceDoc(null);
    } catch (error) {
      console.error("Error guardando dispositivo:", error);
      alert("Hubo un error al guardar el dispositivo.");
    } finally {
      setIsSavingDevice(false);
    }
  };

  const handleDeleteDevice = async (id: string) => {
    if (window.confirm("⚠️ ¿Estás seguro de eliminar este dispositivo permanentemente?")) {
      try {
        await deleteDoc(doc(db, "dispositivos_red", id));
        alert("✅ Dispositivo eliminado.");
      } catch (error) {
        console.error("Error eliminando dispositivo:", error);
        alert("Hubo un error al eliminar.");
      }
    }
  };

  // ========================================================
  // CONTROL DE GABINETES (RACK BUILDER)
  // ========================================================
  const handleSaveGabinete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gabineteForm.nombre) return;
    try {
      if (activeGabinete && activeGabinete.id) {
        await updateDoc(doc(db, "gabinetes", activeGabinete.id), {
          ...gabineteForm
        });
        alert("✅ Gabinete actualizado correctamente.");
      } else {
        const docRef = await addDoc(collection(db, "gabinetes"), {
          ...gabineteForm,
          dispositivos: [], // Inicialmente vacío
          createdAt: new Date().toISOString()
        });
        alert("✅ Gabinete creado correctamente.");
      }
      setShowGabineteModal(false);
      setGabineteForm({ nombre: "", ubicacion: "", unidades: 42 });
    } catch (error) {
      console.error("Error guardando gabinete:", error);
      alert("Hubo un error al guardar el gabinete.");
    }
  };

  const handleDeleteGabinete = async (id: string) => {
    if (window.confirm("⚠️ ¿Estás seguro de eliminar este Gabinete permanentemente?")) {
      try {
        await deleteDoc(doc(db, "gabinetes", id));
        if (activeGabinete && activeGabinete.id === id) {
          setActiveGabinete(null);
        }
        alert("✅ Gabinete eliminado.");
      } catch (error) {
        console.error("Error eliminando gabinete:", error);
        alert("Hubo un error al eliminar.");
      }
    }
  };

  const handleAssignDeviceToU = async (deviceId: string, startU: number) => {
    if (!activeGabinete) return;
    
    // Find device in inventory to get its U size
    const device = dispositivos.find(d => d.id === deviceId);
    if (!device) return;
    const sizeU = device.unidadesU || 1;
    
    // Validar si el slot está ocupado
    const isOccupied = activeGabinete.dispositivos?.some((d: any) => {
      const start = d.uPos;
      const end = d.uPos + (d.heightU || 1) - 1;
      return (startU >= start && startU <= end) || (startU + sizeU - 1 >= start && startU + sizeU - 1 <= end);
    });

    if (isOccupied) {
      alert("El espacio seleccionado ya está ocupado o no hay suficientes Unidades libres hacia abajo.");
      return;
    }

    const newDeviceAssignment = {
      id: deviceId,
      uPos: startU,
      heightU: sizeU,
      isPassive: ["Patch Panel", "Organizador"].includes(device.tipo)
    };

    // Optimistic UI Update: Instant visual feedback
    const previousGabinete = { ...activeGabinete };
    const updatedDispositivos = [...(activeGabinete.dispositivos || []), newDeviceAssignment];
    setActiveGabinete({ ...activeGabinete, dispositivos: updatedDispositivos });

    try {
      await updateDoc(doc(db, "gabinetes", activeGabinete.id), {
        dispositivos: updatedDispositivos
      });
    } catch (error) {
      console.error("Error asignando equipo:", error);
      alert("Error al asignar el equipo al gabinete.");
      setActiveGabinete(previousGabinete); // Revert on failure
    }
  };

  const handleRemoveDeviceFromU = async (assignmentId: string) => {
    if (!activeGabinete) return;
    if (window.confirm("¿Retirar dispositivo de este gabinete?")) {
      const previousGabinete = { ...activeGabinete };
      const updatedDispositivos = activeGabinete.dispositivos.filter((d: any) => d.id !== assignmentId);
      
      // Optimistic UI Update
      setActiveGabinete({ ...activeGabinete, dispositivos: updatedDispositivos });

      try {
        await updateDoc(doc(db, "gabinetes", activeGabinete.id), {
          dispositivos: updatedDispositivos
        });
      } catch (error) {
        console.error("Error retirando equipo:", error);
        setActiveGabinete(previousGabinete); // Revert
      }
    }
  };

  // ========================================================
  // CONTROL DE AUDITORÍAS Y EDICIÓN
  // ========================================================
  const handleDeleteAuditoria = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer.")) {
      try {
        await deleteDoc(doc(db, "inspecciones", id));
        setInspecciones(prev => prev.filter(i => i.id !== id));
      } catch (error) {
        console.error("Error eliminando auditoria:", error);
      }
    }
  };

  const handleApproveModification = async (id: string) => {
    if (confirm("¿Aprobar esta solicitud para que el técnico pueda editar el registro?")) {
      try {
        await updateDoc(doc(db, "inspecciones", id), {
          solicitud_modificacion: "Aprobada"
        });
        setInspecciones(prev => prev.map(i => i.id === id ? { ...i, solicitud_modificacion: "Aprobada" } : i));
      } catch (error) {
        console.error("Error aprobando modificación:", error);
      }
    }
  };

  const handleRejectModification = async (id: string) => {
    if (confirm("¿Rechazar esta solicitud de modificación?")) {
      try {
        await updateDoc(doc(db, "inspecciones", id), {
          solicitud_modificacion: "Rechazada"
        });
        setInspecciones(prev => prev.map(i => i.id === id ? { ...i, solicitud_modificacion: "Rechazada" } : i));
      } catch (error) {
        console.error("Error rechazando modificación:", error);
      }
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editDoc) return;
    try {
      const formData = new FormData(e.currentTarget);
      const dataToUpdate = Object.fromEntries(formData.entries());
      await updateDoc(doc(db, "inspecciones", editDoc.id), dataToUpdate);
      setEditDoc(null); 
      alert("✅ Registro actualizado correctamente");
    } catch (error) {
      console.error("Error actualizando:", error);
    }
  };

  // ========================================================
  // CONTROL DE CMS WEB
  // ========================================================
  const handleSaveCmsDoc = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = Object.fromEntries(formData.entries());
    
    if (cmsSubTab === "servicios" && typeof data.features === "string") {
      data.features = data.features.split(",").map((s: string) => sanitizeInput(s.trim())).filter((s: string) => s);
    }
    if (cmsSubTab === "proyectos" && typeof data.tech === "string") {
      data.tech = data.tech.split(",").map((s: string) => sanitizeInput(s.trim())).filter((s: string) => s);
    }

    // Sanitizar todos los campos de texto
    Object.keys(data).forEach(key => {
      if (typeof data[key] === "string") {
        data[key] = sanitizeInput(data[key]);
      }
    });

    try {
      const collectionName = cmsSubTab === "servicios" ? "web_services" : "web_projects";
      if (cmsEditDoc) {
        await updateDoc(doc(db, collectionName, cmsEditDoc.id), data);
        alert("✅ Registro actualizado");
      } else {
        await addDoc(collection(db, collectionName), { ...data, createdAt: new Date().toISOString() });
        alert("✅ Registro creado");
      }
      setShowCmsModal(false);
      setCmsEditDoc(null);
    } catch (error) {
      console.error("Error guardando documento CMS:", error);
      alert("Error al guardar en el CMS");
    }
  };

  const handleDeleteCmsDoc = async (id: string) => {
    if (window.confirm("⚠️ ¿Eliminar este registro de la web pública?")) {
      const collectionName = cmsSubTab === "servicios" ? "web_services" : "web_projects";
      await deleteDoc(doc(db, collectionName, id));
    }
  };

  const openCmsModal = (doc: any = null) => {
    setCmsEditDoc(doc);
    setShowCmsModal(true);
  };

  const handleSaveWebContent = async (docId: string, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = Object.fromEntries(formData.entries());
    
    // Parse arrays
    Object.keys(data).forEach(key => {
      if (key.startsWith("array_")) {
         const newKey = key.replace("array_", "");
         data[newKey] = data[key].split(",").map((s: string) => sanitizeInput(s.trim())).filter((s: string) => s);
         delete data[key];
      } else if (typeof data[key] === "string") {
         data[key] = sanitizeInput(data[key]);
      }
    });

    try {
      await setDoc(doc(db, "web_content", docId), data, { merge: true });
      alert("✅ Sección actualizada exitosamente.");
    } catch (error) {
      console.error("Error guardando:", error);
      alert("Hubo un error al guardar los cambios.");
    }
  };

  // ========================================================
  // MOTOR DE GENERACIÓN DE PDF PROFESIONAL
  // ========================================================
  const exportToPDF = async (inspeccionesToExport: Inspeccion[], filename: string) => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ format: "letter" }); 

      const azulCorp = { r: 34, g: 42, b: 104 };
      const rojoCorp = { r: 237, g: 28, b: 36 };
      const grisPizarra = { r: 80, g: 90, b: 100 };
      const grisPlatino = { r: 240, g: 242, b: 245 };

      let logoBase64: string | null = null;
      try {
        const response = await fetch('/logo.png');
        const blob = await response.blob();
        logoBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.warn("No se pudo cargar el logo para el PDF.");
      }

      for (let i = 0; i < inspeccionesToExport.length; i++) {
        const item = inspeccionesToExport[i];
        if (i > 0) doc.addPage();

        let y = 15;

        if (logoBase64) doc.addImage(logoBase64, 'PNG', 15, y, 20, 15); 

        doc.setFont("helvetica", "bold");
        doc.setTextColor(azulCorp.r, azulCorp.g, azulCorp.b);
        doc.setFontSize(15);
        doc.text("INFORME DE AUDITORÍA TÉCNICA", 200, y + 6, { align: "right" });

        doc.setFont("helvetica", "normal");
        doc.setTextColor(grisPizarra.r, grisPizarra.g, grisPizarra.b);
        doc.setFontSize(8.5);
        doc.text("Hospital San Vicente de Arauca — DC Telemática", 200, y + 12, { align: "right" });

        y += 18;
        doc.setDrawColor(rojoCorp.r, rojoCorp.g, rojoCorp.b);
        doc.setLineWidth(0.6);
        doc.line(15, y, 200, y);

        y += 12;

        const drawSectionHeader = (title: string, yPos: number) => {
          doc.setFillColor(azulCorp.r, azulCorp.g, azulCorp.b);
          doc.rect(15, yPos, 185, 7, 'F');
          doc.setFont("helvetica", "bold");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9.5);
          doc.text(title, 18, yPos + 5);
        };

        const drawInfoRow = (label1: string, val1: string, label2: string, val2: string, yPos: number) => {
          doc.setFillColor(grisPlatino.r, grisPlatino.g, grisPlatino.b);
          doc.rect(15, yPos, 185, 8, 'F');
          doc.setFont("helvetica", "bold");
          doc.setTextColor(grisPizarra.r, grisPizarra.g, grisPizarra.b);
          doc.setFontSize(8.5);
          doc.text(`${label1}:`, 18, yPos + 5.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(15, 23, 42);
          doc.text(`${val1 || "N/A"}`, 50, yPos + 5.5);
          if (label2) {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(grisPizarra.r, grisPizarra.g, grisPizarra.b);
            doc.text(`${label2}:`, 110, yPos + 5.5);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(15, 23, 42);
            doc.text(`${val2 || "N/A"}`, 145, yPos + 5.5);
          }
        };

        drawSectionHeader("1. IDENTIFICACIÓN GENERAL", y); y += 7;
        drawInfoRow("Registro Número", item.registro_num || "N/A", "Fecha / Hora", item.fecha_hora || "N/A", y); y += 9;
        
        // Fila actualizada para mostrar el Nombre del Auditor Profesional
        drawInfoRow("Auditor Profesional", item.auditor_profesional || item.tecnico_nombre || "Ing. David Carreño", "", "", y); y += 9; 
        
        drawInfoRow("ID Punto de Red", item.punto_id || "N/A", "Ubicación Física", item.ubicacion || "N/A", y); y += 15;

        drawSectionHeader("2. CONECTIVIDAD Y EQUIPO ACTIVO", y); y += 7;
        drawInfoRow("Puerto en Switch", item.switch_port || "N/A", "Estado del Puerto", item.switch_estado || "N/A", y); y += 9;
        drawInfoRow("Estado del Enlace", item.enlace || "N/A", "Prueba DHCP / IP", item.dhcp || "N/A", y); y += 15;

        drawSectionHeader("3. INFRAESTRUCTURA FÍSICA Y ESTRUCTURAL", y); y += 7;
        drawInfoRow("Tipo Canalización", item.tipo_canalizacion || "N/A", "Estado Canal.", item.est_canalizacion || "N/A", y); y += 9;
        drawInfoRow("Estado Faceplate", item.fisico || "N/A", "Patch Cord (Toma)", item.patch_estado || "N/A", y); y += 9;
        drawInfoRow("Categoría Cable", item.patch_cat || "N/A", "Fabricación Cable", item.patch_tipo || "N/A", y); y += 18;

        drawSectionHeader("4. REGISTRO FOTOGRÁFICO", y); y += 12;

        const imgWidth = 56;
        const imgHeight = 42;
        const imgY = y + 5;

        const drawPhotoWithLabel = (base64: string | undefined, title: string, xPos: number) => {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(grisPizarra.r, grisPizarra.g, grisPizarra.b);
          doc.setFontSize(8.5);
          doc.text(title, xPos + (imgWidth / 2), y, { align: "center" });

          doc.setDrawColor(azulCorp.r, azulCorp.g, azulCorp.b);
          doc.setFillColor(grisPlatino.r, grisPlatino.g, grisPlatino.b);
          doc.setLineWidth(0.4);
          doc.rect(xPos, imgY, imgWidth, imgHeight, 'F');
          doc.rect(xPos, imgY, imgWidth, imgHeight, 'S');

          if (base64) {
            try { doc.addImage(base64, 'JPEG', xPos + 0.5, imgY + 0.5, imgWidth - 1, imgHeight - 1); } 
            catch (e) { doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.text("(Error de imagen)", xPos + (imgWidth / 2), imgY + (imgHeight / 2), { align: "center" }); }
          } else {
            doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.text("(Sin registro)", xPos + (imgWidth / 2), imgY + (imgHeight / 2), { align: "center" });
          }
        };

        drawPhotoWithLabel(item.foto_1_base64, "1. Panorámica", 15);
        drawPhotoWithLabel(item.foto_2_base64, "2. Detalle Faceplate", 79.5);
        drawPhotoWithLabel(item.foto_3_base64, "3. Evidencia Adicional", 144);

        y = imgY + imgHeight + 25;

        doc.setDrawColor(rojoCorp.r, rojoCorp.g, rojoCorp.b);
        doc.setLineWidth(0.5);
        doc.line(15, y, 200, y);
        y += 10;

        doc.setFont("helvetica", "bold");
        doc.setTextColor(azulCorp.r, azulCorp.g, azulCorp.b);
        doc.setFontSize(9);
        doc.text("Auditor Profesional:", 15, y);
        doc.setDrawColor(grisPizarra.r, grisPizarra.g, grisPizarra.b);
        
        // Colocamos el nombre del técnico encima de la línea de firma si está disponible
        const nombreFirma = item.auditor_profesional || item.tecnico_nombre || "Ing. David Carreño";
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.text(nombreFirma, 20, y - 4);
        
        doc.line(15, y + 10, 80, y + 10); 

        doc.setFont("helvetica", "bold");
        doc.text("Firma de Recibido (Hospital):", 115, y);
        doc.line(115, y + 10, 180, y + 10);

        y += 20;
        doc.setFont("helvetica", "italic");
        doc.setTextColor(grisPizarra.r, grisPizarra.g, grisPizarra.b);
        doc.setFontSize(7);
        doc.text(`Documento generado por el Panel de Ingeniería de DC Telemática. Id Registro: ${item.id}`, 107.5, y, { align: "center" });
      }

      doc.save(filename);
    } catch (error) {
      alert("Error al procesar PDF. Verifica la instalación de jspdf.");
    }
  };

  const handleGeneratePDF = (docs: Inspeccion[], filename: string) => {
    setIsGeneratingPDF(true);
    setTimeout(async () => {
      await exportToPDF(docs, filename);
      setIsGeneratingPDF(false);
    }, 150); 
  };

  if (!isClient) return null;

  return (
    <main className="relative z-10 min-h-screen p-4 md:p-8 text-gray-200 pb-24">
      
      {/* Estilos Animación 3D */}
      <style>{`
        .perspective-1000 { perspective: 1000px; }
        @keyframes subtleOrbit {
          0% { transform: rotateY(-6deg) rotateX(4deg) translateY(0px); }
          50% { transform: rotateY(6deg) rotateX(-4deg) translateY(-5px); }
          100% { transform: rotateY(-6deg) rotateX(4deg) translateY(0px); }
        }
        .animate-3d-tilt { animation: subtleOrbit 6s ease-in-out infinite; transform-style: preserve-3d; }
      `}</style>

      {/* Modal de Carga de PDF */}
      {isGeneratingPDF && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
           <div className="w-16 h-16 border-4 border-cyan-900 border-t-cyan-400 rounded-full animate-spin mb-4"></div>
           <h2 className="text-2xl font-bold text-cyan-400 animate-pulse text-center px-4">Diseñando Documento Carta...</h2>
        </div>
      )}

      {/* ENCABEZADO DEL PANEL */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 bg-black/60 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-6">
           <div className="relative w-20 h-20 md:w-28 md:h-28 perspective-1000">
              <div className="absolute inset-0 bg-cyan-500/10 rounded-full blur-2xl animate-pulse"></div>
              <div className="relative w-full h-full animate-3d-tilt">
                <Image src="/logo.png" alt="Logo DC Telemática" fill className="object-contain drop-shadow-[0_0_12px_rgba(6,182,212,0.7)]" />
              </div>
            </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase tracking-wider">
              Panel de Ingeniería
            </h1>
            <p className="text-gray-400 text-sm mt-1 font-medium">Gestión y Auditoría Hospital San Vicente de Arauca</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-6 md:mt-0 w-full md:w-auto">
          {activeTab === "auditorias" && (
            <button onClick={() => handleGeneratePDF(inspecciones, "Reporte_General_Auditoria.pdf")} disabled={inspecciones.length === 0} className="flex-1 md:flex-none px-6 py-3 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500 hover:text-black rounded-lg transition-all font-bold shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              📄 Exportar Todo a PDF
            </button>
          )}
          <button onClick={handleLogout} className="flex-1 md:flex-none px-6 py-3 bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white rounded-lg transition-all font-bold">
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* PESTAÑAS DE NAVEGACIÓN */}
      <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
        <button onClick={() => setActiveTab("auditorias")} className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'auditorias' ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
          📋 Registros de Auditoría
        </button>
        <button onClick={() => setActiveTab("usuarios")} className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'usuarios' ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
          👥 Gestión de Usuarios
        </button>
        <button onClick={() => setActiveTab("cms")} className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'cms' ? 'bg-green-600 text-white shadow-[0_0_15px_rgba(22,163,74,0.4)]' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
          🌐 CMS Web Corporativa
        </button>
        <button onClick={() => setActiveTab("dispositivos")} className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'dispositivos' ? 'bg-orange-600 text-white shadow-[0_0_15px_rgba(234,88,12,0.4)]' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
          🖥️ Dispositivos de Red
        </button>
        {currentUserRole === 'ingeniero' && (
          <button onClick={() => setActiveTab("gabinetes")} className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'gabinetes' ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
            🗄️ Data Center / Gabinetes
          </button>
        )}
        {currentUserRole === 'ingeniero' && (
          <button onClick={() => setActiveTab("tareas")} className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'tareas' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
            🛠️ Gestión de Tareas
          </button>
        )}
      </div>

      {/* ==============================================
          VISTA 1: TABLA DE AUDITORÍAS
          ============================================== */}
      {activeTab === "auditorias" && (
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl w-full p-4 md:p-8 shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-x-auto animate-in fade-in duration-300">
          {loading ? (
            <div className="flex justify-center items-center py-20"><div className="w-12 h-12 border-4 border-cyan-900 border-t-cyan-400 rounded-full animate-spin"></div></div>
          ) : inspecciones.length === 0 ? (
            <div className="text-center py-20 text-gray-500"><p className="text-xl">No hay registros de inspección todavía.</p></div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-white/10 text-cyan-400">
                  <th className="py-4 px-4 font-semibold">Reg N°</th>
                  <th className="py-4 px-4 font-semibold">Fecha</th>
                  <th className="py-4 px-4 font-semibold">Auditor Profesional</th>
                  <th className="py-4 px-4 font-semibold">Punto ID</th>
                  <th className="py-4 px-4 font-semibold">Ubicación</th>
                  <th className="py-4 px-4 font-semibold text-center">Fotos</th>
                  <th className="py-4 px-4 font-semibold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {inspecciones.map((inspeccion) => (
                  <tr key={inspeccion.id} className={`border-b border-white/5 transition-colors ${inspeccion.solicitud_modificacion === 'Pendiente' ? 'bg-yellow-500/20 hover:bg-yellow-500/30' : 'hover:bg-white/5'}`}>
                    <td className="py-4 px-4 font-bold">
                      {inspeccion.registro_num || "-"}
                      {inspeccion.solicitud_modificacion === 'Pendiente' && (
                        <div className="text-xs text-yellow-400 mt-1 font-normal break-words max-w-[200px]">
                          <strong>Motivo:</strong> {inspeccion.motivo_modificacion}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-400 whitespace-nowrap">{inspeccion.fecha_hora || "-"}</td>
                    <td className="py-4 px-4 text-sm text-cyan-200">{inspeccion.auditor_profesional || inspeccion.tecnico_nombre || "Ing. David Carreño"}</td>
                    <td className="py-4 px-4 font-medium text-cyan-100">{inspeccion.punto_id || "-"}</td>
                    <td className="py-4 px-4 text-sm">{inspeccion.ubicacion || "-"}</td>
                    <td className="py-4 px-4 text-center">{inspeccion.foto_1_base64 || inspeccion.foto_2_base64 ? "📷 Sí" : "❌ No"}</td>
                    <td className="py-4 px-4">
                      <div className="flex justify-center gap-2 flex-wrap max-w-[150px]">
                        <button onClick={() => setViewDoc(inspeccion)} className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded transition-colors" title="Ver Detalles">👁️</button>
                        <button onClick={() => setEditDoc(inspeccion)} className="p-2 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500 hover:text-black rounded transition-colors" title="Editar Admin">✏️</button>
                        <button onClick={() => handleGeneratePDF([inspeccion], `Reporte_${inspeccion.punto_id || 'Inspeccion'}.pdf`)} className="p-2 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-black rounded transition-colors" title="Exportar a PDF">📄</button>
                        <button onClick={() => handleDeleteAuditoria(inspeccion.id)} className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded transition-colors" title="Eliminar">🗑️</button>
                        
                        {inspeccion.solicitud_modificacion === 'Pendiente' && (
                          <div className="w-full flex gap-1 mt-1">
                            <button onClick={() => handleApproveModification(inspeccion.id)} className="flex-1 p-1 bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white rounded text-xs font-bold transition-colors" title="Aprobar Edición al Técnico">✅</button>
                            <button onClick={() => handleRejectModification(inspeccion.id)} className="flex-1 p-1 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded text-xs font-bold transition-colors" title="Rechazar">❌</button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ==============================================
          VISTA 2: TABLA DE USUARIOS
          ============================================== */}
      {activeTab === "usuarios" && (
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl w-full p-4 md:p-8 shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-x-auto animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b border-white/10 pb-4 gap-4">
            <h2 className="text-2xl font-bold text-purple-400">Control de Accesos Corporativos</h2>
            <button onClick={() => setShowUserModal(true)} className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(147,51,234,0.3)]">
              <span className="text-xl leading-none">+</span> Nuevo Usuario
            </button>
          </div>
          
          {loadingUsers ? (
            <div className="flex justify-center items-center py-20"><div className="w-12 h-12 border-4 border-purple-900 border-t-purple-400 rounded-full animate-spin"></div></div>
          ) : usuarios.length === 0 ? (
            <div className="text-center py-20 text-gray-500"><p className="text-xl">No hay usuarios registrados.</p></div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-white/10 text-purple-400">
                  <th className="py-4 px-4 font-semibold">Nombre y Apellido</th>
                  <th className="py-4 px-4 font-semibold">Correo Electrónico</th>
                  <th className="py-4 px-4 font-semibold">Rol de Acceso</th>
                  <th className="py-4 px-4 font-semibold">Fecha de Creación</th>
                  <th className="py-4 px-4 font-semibold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 font-medium text-white">{u.nombre || "Sin nombre"}</td>
                    <td className="py-4 px-4 text-gray-400">{u.email}</td>
                    <td className="py-4 px-4">
                      {u.email === 'ing.davidc@gmail.com' ? (
                        <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 flex inline-flex items-center gap-1">
                          👑 Super Administrador
                        </span>
                      ) : (
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${u.role === 'ingeniero' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'}`}>
                          {u.role === 'ingeniero' ? 'Ingeniero / Admin' : 'Técnico Operativo'}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString('es-CO')}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {u.email !== 'ing.davidc@gmail.com' ? (
                        <>
                           <button onClick={() => {
                              setEditUserDoc(u);
                              setEditUserName(u.nombre || "");
                              setEditUserRole(u.role || "tecnico");
                              setShowEditUserModal(true);
                           }} className="px-3 py-1 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500 hover:text-black rounded border border-yellow-500/30 transition-colors font-semibold mr-2 mb-2 sm:mb-0" title="Editar Información">
                              Editar
                           </button>
                           <button onClick={() => handleDeleteUser(u.email)} className="px-3 py-1 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded border border-red-500/30 transition-colors font-semibold" title="Revocar Acceso">
                              Revocar
                           </button>
                        </>
                      ) : (
                        <span className="text-xs text-gray-500 italic">Protegido por Sistema</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ==============================================
          VISTA 3: CMS WEB
          ============================================== */}
      {activeTab === "cms" && (
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl w-full p-4 md:p-8 shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-x-auto animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b border-white/10 pb-4 gap-4">
            <h2 className="text-2xl font-bold text-green-400">Gestor de Contenidos (CMS)</h2>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setCmsSubTab("servicios")} className={`px-4 py-2 rounded-lg font-bold transition-all ${cmsSubTab === 'servicios' ? 'bg-green-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>Servicios</button>
              <button onClick={() => setCmsSubTab("proyectos")} className={`px-4 py-2 rounded-lg font-bold transition-all ${cmsSubTab === 'proyectos' ? 'bg-green-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>Proyectos</button>
              <button onClick={() => setCmsSubTab("hero")} className={`px-4 py-2 rounded-lg font-bold transition-all ${cmsSubTab === 'hero' ? 'bg-green-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>Sección: Inicio</button>
              <button onClick={() => setCmsSubTab("about")} className={`px-4 py-2 rounded-lg font-bold transition-all ${cmsSubTab === 'about' ? 'bg-green-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>Sección: Nosotros</button>
              <button onClick={() => setCmsSubTab("contact")} className={`px-4 py-2 rounded-lg font-bold transition-all ${cmsSubTab === 'contact' ? 'bg-green-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>Sección: Contacto</button>
              <button onClick={() => setCmsSubTab("global")} className={`px-4 py-2 rounded-lg font-bold transition-all ${cmsSubTab === 'global' ? 'bg-green-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>Enlaces Globales</button>
              
              {(cmsSubTab === "servicios" || cmsSubTab === "proyectos") && (
                <button onClick={() => openCmsModal()} className="px-5 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors flex items-center gap-2 ml-4">
                  <span className="text-xl leading-none">+</span> Nuevo
                </button>
              )}
            </div>
          </div>
          
          {(cmsSubTab === "servicios" || cmsSubTab === "proyectos") && (
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-white/10 text-green-400">
                  <th className="py-4 px-4 font-semibold">Título</th>
                  <th className="py-4 px-4 font-semibold">{cmsSubTab === "servicios" ? "Ícono" : "Categoría"}</th>
                  <th className="py-4 px-4 font-semibold">Descripción</th>
                  <th className="py-4 px-4 font-semibold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(cmsSubTab === "servicios" ? webServices : webProjects).map((item) => (
                  <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 font-medium text-white">{item.title}</td>
                    <td className="py-4 px-4 text-gray-400">{cmsSubTab === "servicios" ? item.icon : item.category}</td>
                    <td className="py-4 px-4 text-sm text-gray-400 max-w-xs truncate">{item.description}</td>
                    <td className="py-4 px-4 text-center">
                      <button onClick={() => openCmsModal(item)} className="p-2 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500 hover:text-black rounded transition-colors mx-1" title="Editar">✏️</button>
                      <button onClick={() => handleDeleteCmsDoc(item.id)} className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded transition-colors mx-1" title="Eliminar">🗑️</button>
                    </td>
                  </tr>
                ))}
                {(cmsSubTab === "servicios" ? webServices : webProjects).length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500">No hay registros guardados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* Formulario CMS - HERO */}
          {cmsSubTab === "hero" && (
            <form onSubmit={(e) => handleSaveWebContent("hero", e)} className="max-w-2xl space-y-6">
              <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                <h3 className="text-lg font-bold text-white mb-4">Textos Principales</h3>
                <div className="space-y-4">
                  <div><label className="text-sm font-semibold text-gray-400 block mb-1">Título Superior:</label><input type="text" name="title1" defaultValue={cmsContent?.hero?.title1 || "Conectamos tu"} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none" /></div>
                  <div><label className="text-sm font-semibold text-gray-400 block mb-1">Palabra Resaltada:</label><input type="text" name="title2" defaultValue={cmsContent?.hero?.title2 || "Futuro Digital"} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none" /></div>
                  <div><label className="text-sm font-semibold text-gray-400 block mb-1">Descripción:</label><textarea name="description" defaultValue={cmsContent?.hero?.description || "Soluciones integrales en telecomunicaciones, redes e infraestructura tecnológica..."} rows={3} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none resize-none"></textarea></div>
                </div>
              </div>
              <button type="submit" className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors">Guardar Sección Inicio</button>
            </form>
          )}

          {/* Formulario CMS - ABOUT */}
          {cmsSubTab === "about" && (
            <form onSubmit={(e) => handleSaveWebContent("about", e)} className="max-w-2xl space-y-6">
              <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                <h3 className="text-lg font-bold text-white mb-4">Textos de Sobre Nosotros</h3>
                <div className="space-y-4">
                  <div><label className="text-sm font-semibold text-gray-400 block mb-1">Título:</label><input type="text" name="title" defaultValue={cmsContent?.about?.title || "Expertos en"} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none" /></div>
                  <div><label className="text-sm font-semibold text-gray-400 block mb-1">Palabra Resaltada:</label><input type="text" name="highlight" defaultValue={cmsContent?.about?.highlight || "Telecomunicaciones"} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none" /></div>
                  <div><label className="text-sm font-semibold text-gray-400 block mb-1">Párrafo 1:</label><textarea name="p1" defaultValue={cmsContent?.about?.p1 || "DC Telemática es una empresa especializada en soluciones de telecomunicaciones..."} rows={3} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none resize-none"></textarea></div>
                  <div><label className="text-sm font-semibold text-gray-400 block mb-1">Tecnologías (separadas por coma):</label><input type="text" name="array_tech" defaultValue={cmsContent?.about?.tech?.join(", ") || "Cisco, Juniper, Aruba, Fortinet"} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none" /></div>
                  <div><label className="text-sm font-semibold text-gray-400 block mb-1">Certificaciones (separadas por coma):</label><input type="text" name="array_certs" defaultValue={cmsContent?.about?.certs?.join(", ") || "CCNA/CCNP, JNCIA/JNCIS, ISO 27001"} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none" /></div>
                </div>
              </div>
              <button type="submit" className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors">Guardar Sección Nosotros</button>
            </form>
          )}

          {/* Formulario CMS - CONTACT */}
          {cmsSubTab === "contact" && (
            <form onSubmit={(e) => handleSaveWebContent("contact", e)} className="max-w-2xl space-y-6">
              <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                <h3 className="text-lg font-bold text-white mb-4">Información de Contacto</h3>
                <div className="space-y-4">
                  <div><label className="text-sm font-semibold text-gray-400 block mb-1">Correo Electrónico:</label><input type="email" name="email" defaultValue={cmsContent?.contact?.email || "contacto@dctelematica.com"} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none" /></div>
                  <div><label className="text-sm font-semibold text-gray-400 block mb-1">Número WhatsApp:</label><input type="text" name="whatsapp" defaultValue={cmsContent?.contact?.whatsapp || "+57 317 425 1419"} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none" /></div>
                  <div><label className="text-sm font-semibold text-gray-400 block mb-1">Ubicación Física:</label><input type="text" name="location" defaultValue={cmsContent?.contact?.location || "Bogotá, Colombia"} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none" /></div>
                </div>
              </div>
              <button type="submit" className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors">Guardar Sección Contacto</button>
            </form>
          )}

          {/* Formulario CMS - GLOBAL */}
          {cmsSubTab === "global" && (
            <form onSubmit={(e) => handleSaveWebContent("global", e)} className="max-w-2xl space-y-6">
              <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                <h3 className="text-lg font-bold text-white mb-4">Redes Sociales (Footer)</h3>
                <div className="space-y-4">
                  <div><label className="text-sm font-semibold text-gray-400 block mb-1">URL de LinkedIn:</label><input type="text" name="linkedin" defaultValue={cmsContent?.global?.linkedin || "#"} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none" /></div>
                  <div><label className="text-sm font-semibold text-gray-400 block mb-1">URL de Instagram:</label><input type="text" name="instagram" defaultValue={cmsContent?.global?.instagram || "#"} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none" /></div>
                  <div><label className="text-sm font-semibold text-gray-400 block mb-1">URL de Facebook:</label><input type="text" name="facebook" defaultValue={cmsContent?.global?.facebook || "#"} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none" /></div>
                </div>
              </div>
              <button type="submit" className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors">Guardar Enlaces Globales</button>
            </form>
          )}

        </div>
      )}

      {/* =========================================================
          MODAL: CREAR NUEVO USUARIO
         ========================================================= */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#0a0a0a] border border-purple-500/30 p-6 md:p-8 rounded-2xl w-full max-w-md shadow-[0_0_50px_rgba(147,51,234,0.15)] my-8">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <h2 className="text-2xl font-bold text-purple-400">Nuevo Usuario</h2>
              <button onClick={() => setShowUserModal(false)} className="text-gray-500 hover:text-white font-bold text-xl">✕</button>
            </div>
            
            <form onSubmit={handleCreateUser} className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-gray-300 block mb-1">Nombre y Apellido:</label>
                <input type="text" value={newUserName} onChange={e=>setNewUserName(e.target.value)} required className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-purple-500 outline-none transition-colors" placeholder="Ej. Juan Pérez"/>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-300 block mb-1">Correo Electrónico:</label>
                <input type="email" value={newUserEmail} onChange={e=>setNewUserEmail(e.target.value)} required className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-purple-500 outline-none transition-colors" placeholder="tecnico@dctelematica.com"/>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-300 block mb-1">Contraseña Provisoria:</label>
                <input type="password" value={newUserPassword} onChange={e=>setNewUserPassword(e.target.value)} required minLength={6} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-purple-500 outline-none transition-colors" placeholder="Mínimo 6 caracteres"/>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-300 block mb-1">Asignar Rol:</label>
                <select value={newUserRole} onChange={e=>setNewUserRole(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-purple-500 outline-none cursor-pointer">
                  <option value="tecnico">Técnico Operativo (Solo Formulario)</option>
                  <option value="ingeniero">Ingeniero Administrador (Panel Completo)</option>
                </select>
              </div>

              <div className="pt-6 border-t border-white/10 flex gap-4">
                <button type="button" onClick={() => setShowUserModal(false)} className="w-1/2 py-3 bg-transparent border border-gray-600 text-gray-400 hover:bg-white/5 rounded-lg transition-colors font-bold">
                  Cancelar
                </button>
                <button type="submit" disabled={isCreatingUser} className="w-1/2 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors disabled:opacity-50">
                  {isCreatingUser ? "Creando..." : "Crear Acceso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: CMS WEB
         ========================================================= */}
      {showCmsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#0a0a0a] border border-green-500/30 p-6 md:p-8 rounded-2xl w-full max-w-lg shadow-[0_0_50px_rgba(22,163,74,0.15)] my-8">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <h2 className="text-2xl font-bold text-green-400">{cmsEditDoc ? "Editar Registro" : "Nuevo Registro"}</h2>
              <button onClick={() => setShowCmsModal(false)} className="text-gray-500 hover:text-white font-bold text-xl">✕</button>
            </div>
            
            <form onSubmit={handleSaveCmsDoc} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-300 block mb-1">Título:</label>
                <input type="text" name="title" defaultValue={cmsEditDoc?.title} required className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-green-500 outline-none" />
              </div>
              
              {cmsSubTab === "servicios" ? (
                <div>
                  <label className="text-sm font-semibold text-gray-300 block mb-1">Nombre Ícono (ej. Network, Wifi, Server):</label>
                  <input type="text" name="icon" defaultValue={cmsEditDoc?.icon} required className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-green-500 outline-none" />
                </div>
              ) : (
                <div>
                  <label className="text-sm font-semibold text-gray-300 block mb-1">Categoría:</label>
                  <input type="text" name="category" defaultValue={cmsEditDoc?.category} required className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-green-500 outline-none" />
                </div>
              )}

              <div>
                <label className="text-sm font-semibold text-gray-300 block mb-1">Descripción breve:</label>
                <textarea name="description" defaultValue={cmsEditDoc?.description} required rows={3} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-green-500 outline-none resize-none"></textarea>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-300 block mb-1">
                  {cmsSubTab === "servicios" ? "Características (separadas por coma):" : "Tecnologías (separadas por coma):"}
                </label>
                <input type="text" name={cmsSubTab === "servicios" ? "features" : "tech"} defaultValue={cmsSubTab === "servicios" ? cmsEditDoc?.features?.join(", ") : cmsEditDoc?.tech?.join(", ")} required className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-green-500 outline-none" placeholder="Ej. Elemento 1, Elemento 2, Elemento 3" />
              </div>

              <div className="pt-6 border-t border-white/10 flex gap-4">
                <button type="button" onClick={() => setShowCmsModal(false)} className="w-1/2 py-3 bg-transparent border border-gray-600 text-gray-400 hover:bg-white/5 rounded-lg transition-colors font-bold">Cancelar</button>
                <button type="submit" className="w-1/2 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODALES DE AUDITORÍA (VER Y EDITAR)
         ========================================================= */}
      {viewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#0a0a0a] border border-cyan-500/30 p-6 md:p-8 rounded-2xl w-full max-w-4xl shadow-[0_0_50px_rgba(6,182,212,0.15)] my-8">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <h2 className="text-2xl font-bold text-cyan-400">Detalles de Inspección</h2>
              <button onClick={() => setViewDoc(null)} className="text-gray-500 hover:text-white font-bold text-xl">✕</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4 text-sm">
                <div className="bg-white/5 p-4 rounded-lg"><h3 className="text-cyan-500 font-bold mb-2">📍 Datos Principales</h3><p><span className="text-gray-400">Registro N°:</span> {viewDoc.registro_num}</p><p><span className="text-gray-400">Fecha:</span> {viewDoc.fecha_hora}</p><p><span className="text-gray-400">Auditor Técnico:</span> {viewDoc.tecnico_nombre || "No registrado"}</p><p><span className="text-gray-400">Punto ID:</span> {viewDoc.punto_id}</p><p><span className="text-gray-400">Ubicación:</span> {viewDoc.ubicacion}</p></div>
                <div className="bg-white/5 p-4 rounded-lg"><h3 className="text-cyan-500 font-bold mb-2">🔌 Red y Conectividad</h3><p><span className="text-gray-400">Puerto Switch:</span> {viewDoc.switch_port || "N/A"}</p><p><span className="text-gray-400">Estado Switch:</span> {viewDoc.switch_estado || "N/A"}</p><p><span className="text-gray-400">Enlace:</span> {viewDoc.enlace || "N/A"}</p><p><span className="text-gray-400">Prueba DHCP:</span> {viewDoc.dhcp || "N/A"}</p></div>
                <div className="bg-white/5 p-4 rounded-lg"><h3 className="text-cyan-500 font-bold mb-2">🏗️ Infraestructura Física</h3><p><span className="text-gray-400">Canalización:</span> {viewDoc.tipo_canalizacion || "N/A"}</p><p><span className="text-gray-400">Estado Canalización:</span> {viewDoc.est_canalizacion || "N/A"}</p><p><span className="text-gray-400">Patch Cord:</span> {viewDoc.patch_estado || "N/A"} - {viewDoc.patch_cat}</p></div>
              </div>

              <div className="space-y-4">
                <h3 className="text-cyan-500 font-bold bg-white/5 p-3 rounded-lg text-center">📸 Registro Fotográfico</h3>
                <div className="border border-white/10 rounded-lg p-2 bg-black/50"><p className="text-xs text-gray-400 mb-2">1. Panorámica / Ubicación</p>{viewDoc.foto_1_base64 ? <img src={viewDoc.foto_1_base64} alt="Foto 1" className="w-full h-auto max-h-48 object-contain rounded" /> : <div className="h-32 flex items-center justify-center text-gray-600 bg-white/5 rounded">Sin foto</div>}</div>
                <div className="border border-white/10 rounded-lg p-2 bg-black/50"><p className="text-xs text-gray-400 mb-2">2. Detalle Faceplate</p>{viewDoc.foto_2_base64 ? <img src={viewDoc.foto_2_base64} alt="Foto 2" className="w-full h-auto max-h-48 object-contain rounded" /> : <div className="h-32 flex items-center justify-center text-gray-600 bg-white/5 rounded">Sin foto</div>}</div>
              </div>
            </div>
            <div className="mt-8 text-center"><button onClick={() => setViewDoc(null)} className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-colors">Cerrar Detalles</button></div>
          </div>
        </div>
      )}

      {editDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#0a0a0a] border border-yellow-500/30 p-6 md:p-8 rounded-2xl w-full max-w-4xl shadow-[0_0_50px_rgba(234,179,8,0.15)] my-8">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <h2 className="text-2xl font-bold text-yellow-400">Editar Registro Principal</h2>
              <button onClick={() => setEditDoc(null)} className="text-gray-500 hover:text-white font-bold text-xl">✕</button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {/* 1. Identificación */}
                <div className="md:col-span-2 border-b border-white/10 pb-2"><h3 className="text-cyan-400 font-bold">1. Identificación</h3></div>
                <div><label className="text-sm font-semibold text-gray-300 block mb-1">Punto ID:</label><input type="text" name="punto_id" defaultValue={editDoc.punto_id} required className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:border-yellow-500 outline-none" /></div>
                <div><label className="text-sm font-semibold text-gray-300 block mb-1">Ubicación:</label><input type="text" name="ubicacion" defaultValue={editDoc.ubicacion} required className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:border-yellow-500 outline-none" /></div>
                
                {/* 2. Estado Físico */}
                <div className="md:col-span-2 border-b border-white/10 pb-2 mt-4"><h3 className="text-cyan-400 font-bold">2. Estado Físico y Estructural</h3></div>
                <div>
                  <label className="text-sm font-semibold text-gray-300 block mb-1">Faceplate y Jack:</label>
                  <select name="fisico" defaultValue={editDoc.fisico || "N/A"} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:border-yellow-500 outline-none">
                    <option value="buen_estado">Buen estado general</option>
                    <option value="roto">Faceplate roto/suelto</option>
                    <option value="pines_dañados">Pines oxidados/doblados</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-300 block mb-1">Cableado y Etiquetado:</label>
                  <select name="cable" defaultValue={editDoc.cable || "N/A"} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:border-yellow-500 outline-none">
                    <option value="etiquetado">Correctamente etiquetado</option>
                    <option value="sin_etiqueta">Sin identificar</option>
                    <option value="expuesto">Cable expuesto</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-300 block mb-1">Continuidad:</label>
                  <select name="continuidad" defaultValue={editDoc.continuidad || "N/A"} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:border-yellow-500 outline-none">
                    <option value="ok">Continuidad OK (8 hilos)</option>
                    <option value="abierto">Pares abiertos / rotos</option>
                    <option value="cruzado">Pares cruzados</option>
                    <option value="corto">Cortocircuito</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>
                
                {/* Canalización */}
                <div>
                  <label className="text-sm font-semibold text-gray-300 block mb-1">Tipo Canalización:</label>
                  <select name="tipo_canalizacion" defaultValue={editDoc.tipo_canalizacion || "N/A"} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:border-yellow-500 outline-none">
                    <option value="canaleta">Canaleta Plástica</option>
                    <option value="emt">Tubería EMT</option>
                    <option value="pvc">Tubería PVC</option>
                    <option value="bandeja">Bandeja Portacable</option>
                    <option value="otros">Otros</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-300 block mb-1">Estado Canalización:</label>
                  <select name="est_canalizacion" defaultValue={editDoc.est_canalizacion || "N/A"} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:border-yellow-500 outline-none">
                    <option value="buen_estado">Buen Estado</option>
                    <option value="suelta">Suelta / Mal fijada</option>
                    <option value="saturada">Sobresaturada</option>
                    <option value="rota">Rota / Sin tapas</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>
                
                {/* Patch Cord */}
                <div>
                  <label className="text-sm font-semibold text-gray-300 block mb-1">Estado Patch Cord:</label>
                  <select name="patch_estado" defaultValue={editDoc.patch_estado || "N/A"} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:border-yellow-500 outline-none">
                    <option value="buen_estado">Buen estado</option>
                    <option value="roto">Conectores rotos</option>
                    <option value="deteriorado">Cable deteriorado</option>
                    <option value="ausente">Ausente</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-300 block mb-1">Categoría Patch Cord:</label>
                  <select name="patch_cat" defaultValue={editDoc.patch_cat || "N/A"} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:border-yellow-500 outline-none">
                    <option value="cat5e">Cat 5e</option>
                    <option value="cat6">Cat 6/6A</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-300 block mb-1">Tipo Patch Cord:</label>
                  <select name="patch_tipo" defaultValue={editDoc.patch_tipo || "N/A"} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:border-yellow-500 outline-none">
                    <option value="fabrica">De Fábrica</option>
                    <option value="armado">Armado (Hechizo)</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>
                <div><label className="text-sm font-semibold text-gray-300 block mb-1">Marca Patch Cord:</label><input type="text" name="patch_marca" defaultValue={editDoc.patch_marca} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:border-yellow-500 outline-none" /></div>
                <div><label className="text-sm font-semibold text-gray-300 block mb-1">Longitud Patch Cord:</label><input type="text" name="patch_longitud" defaultValue={editDoc.patch_longitud} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:border-yellow-500 outline-none" /></div>

                {/* 3. Trazabilidad */}
                <div className="md:col-span-2 border-b border-white/10 pb-2 mt-4"><h3 className="text-cyan-400 font-bold">3. Trazabilidad a Switch</h3></div>
                <div><label className="text-sm font-semibold text-gray-300 block mb-1">Puerto Switch:</label><input type="text" name="switch_port" defaultValue={editDoc.switch_port} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:border-yellow-500 outline-none" /></div>
                <div>
                  <label className="text-sm font-semibold text-gray-300 block mb-1">Estado Switch:</label>
                  <select name="switch_estado" defaultValue={editDoc.switch_estado || "N/A"} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:border-yellow-500 outline-none">
                    <option value="up">Puerto Up</option>
                    <option value="down">Shutdown</option>
                    <option value="poe">PoE Activo</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>

                {/* 4. Conectividad */}
                <div className="md:col-span-2 border-b border-white/10 pb-2 mt-4"><h3 className="text-cyan-400 font-bold">4. Conectividad</h3></div>
                <div>
                  <label className="text-sm font-semibold text-gray-300 block mb-1">Estado Enlace:</label>
                  <select name="enlace" defaultValue={editDoc.enlace || "N/A"} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:border-yellow-500 outline-none">
                    <option value="estable">Estable</option>
                    <option value="intermitente">Intermitente</option>
                    <option value="sin_conexion">Sin conexión</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-300 block mb-1">Prueba DHCP:</label>
                  <select name="dhcp" defaultValue={editDoc.dhcp || "N/A"} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:border-yellow-500 outline-none">
                    <option value="exitoso">Asignación IP correcta</option>
                    <option value="falla">Falla DHCP / Conflicto</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-300 block mb-1">Velocidad Enlace:</label>
                  <select name="velocidad_enlace" defaultValue={editDoc.velocidad_enlace || "N/A"} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:border-yellow-500 outline-none">
                    <option value="10M">10M</option>
                    <option value="100M">100M</option>
                    <option value="GIGA">GIGA</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>
              </div>

              <div className="pt-6 border-t border-white/10 flex gap-4">
                <button type="button" onClick={() => setEditDoc(null)} className="w-1/2 py-3 bg-transparent border border-gray-600 text-gray-400 hover:bg-white/5 rounded-lg transition-colors font-bold">Cancelar</button>
                <button type="submit" className="w-1/2 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-colors">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: EDITAR USUARIO EXISTENTE
         ========================================================= */}
      {showEditUserModal && editUserDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#0a0a0a] border border-yellow-500/30 p-6 md:p-8 rounded-2xl w-full max-w-md shadow-[0_0_50px_rgba(234,179,8,0.15)] my-8">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <h2 className="text-2xl font-bold text-yellow-400">Editar Usuario</h2>
              <button onClick={() => setShowEditUserModal(false)} className="text-gray-500 hover:text-white font-bold text-xl">✕</button>
            </div>
            
            <form onSubmit={handleUpdateUser} className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-gray-300 block mb-1">Nombre y Apellido:</label>
                <input type="text" value={editUserName} onChange={e=>setEditUserName(e.target.value)} required className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-yellow-500 outline-none transition-colors" placeholder="Ej. Juan Pérez"/>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-300 block mb-1">Correo Electrónico (No editable):</label>
                <input type="email" value={editUserDoc.email} disabled className="w-full bg-black/20 border border-white/5 rounded-lg p-3 text-gray-500 outline-none cursor-not-allowed"/>
              </div>
              
              <div className="pt-2">
                <label className="text-sm font-semibold text-gray-300 block mb-2">Contraseña:</label>
                <button type="button" onClick={() => handleSendPasswordReset(editUserDoc.email)} className="w-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold py-2 px-4 rounded-lg transition-colors text-sm flex items-center justify-center gap-2">
                  <span>✉️</span> Enviar enlace de reseteo al correo
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">Por seguridad, el usuario debe resetearla desde su correo.</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-300 block mb-1">Rol de Acceso:</label>
                <select value={editUserRole} onChange={e=>setEditUserRole(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-yellow-500 outline-none cursor-pointer">
                  <option value="tecnico">Técnico Operativo (Solo App de Inspección)</option>
                  <option value="ingeniero">Ingeniero Administrador (Acceso Completo)</option>
                </select>
              </div>
              
              <div className="pt-4 border-t border-white/10 mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowEditUserModal(false)} className="px-5 py-3 text-gray-400 hover:text-white font-bold transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-colors">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==============================================
          VISTA 4: DISPOSITIVOS DE RED
          ============================================== */}
      {activeTab === "dispositivos" && (
        <div className="bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.3)]">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 border-b border-white/10 pb-4">
            <h2 className="text-2xl font-bold text-orange-400">Inventario de Dispositivos</h2>
            <button 
              onClick={() => {
                setEditDeviceDoc(null);
                setDeviceForm({ tipo: "Switch", nombre: "", ip: "", marca: "", modelo: "", mac: "", unidadesU: 1, mapCoords: null });
                setShowDeviceModal(true);
              }} 
              className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-[0_0_15px_rgba(234,88,12,0.3)]"
            >
              ➕ Nuevo Dispositivo
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-white/5 text-gray-100 font-bold uppercase">
                <tr>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">IP / MAC</th>
                  <th className="px-4 py-3">Marca / Modelo</th>
                  <th className="px-4 py-3 text-center">Plano</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loadingDispositivos ? (
                  <tr><td colSpan={6} className="text-center py-6 text-orange-400">Cargando inventario...</td></tr>
                ) : dispositivos.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-6 text-gray-500">No hay dispositivos registrados.</td></tr>
                ) : (
                  dispositivos.map((dev) => (
                    <tr key={dev.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded bg-orange-500/20 text-orange-300 font-bold text-xs">{dev.tipo}</span>
                      </td>
                      <td className="px-4 py-3 font-bold text-white">
                        <div>{dev.nombre}</div>
                        {dev.unidadesU && <div className="text-xs text-gray-400">{dev.unidadesU}U</div>}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div>{dev.ip || "-"}</div>
                        <div className="text-gray-500">{dev.mac || "-"}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div>{dev.marca || "-"}</div>
                        <div className="text-gray-400">{dev.modelo || "-"}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {dev.mapCoords ? <span className="text-green-400" title="Ubicación guardada">📍 Sí</span> : <span className="text-gray-600">-</span>}
                      </td>
                      <td className="px-4 py-3 text-center space-x-2">
                        <button 
                          onClick={() => {
                            setEditDeviceDoc(dev);
                            setDeviceForm(dev);
                            setShowDeviceModal(true);
                          }}
                          className="bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 px-3 py-1.5 rounded transition-colors text-xs font-bold"
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => handleDeleteDevice(dev.id)}
                          className="bg-red-500/20 hover:bg-red-500/40 text-red-300 px-3 py-1.5 rounded transition-colors text-xs font-bold"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Agregar / Editar Dispositivo */}
      {showDeviceModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#0a0a0a] border border-orange-500/30 p-6 rounded-2xl w-full max-w-lg shadow-[0_0_50px_rgba(234,88,12,0.15)] my-8">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <h2 className="text-2xl font-bold text-orange-400">{editDeviceDoc ? "Editar Equipo" : "Registrar Equipo"}</h2>
              <button onClick={() => setShowDeviceModal(false)} className="text-gray-500 hover:text-white font-bold text-xl">✕</button>
            </div>
            
            <form onSubmit={handleSaveDevice} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-300 block mb-1">Tipo de Equipo:</label>
                  <select value={deviceForm.tipo} onChange={e=>setDeviceForm({...deviceForm, tipo: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-orange-500 outline-none">
                    <option value="Switch">Switch</option>
                    <option value="Router">Router</option>
                    <option value="Servidor">Servidor</option>
                    <option value="AP">Access Point (AP)</option>
                    <option value="Firewall">Firewall</option>
                    <option value="Patch Panel">Patch Panel (Pasivo)</option>
                    <option value="Organizador">Organizador (Pasivo)</option>
                    <option value="UPS">UPS (Eléctrico)</option>
                    <option value="PDU">PDU / Regleta (Eléctrico)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-300 block mb-1">Nombre (Hostname):</label>
                  <input type="text" required value={deviceForm.nombre} onChange={e=>setDeviceForm({...deviceForm, nombre: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-orange-500 outline-none" placeholder="Ej. SW-PISO-2" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-300 block mb-1">Dirección IP:</label>
                  <input type="text" value={deviceForm.ip || ""} onChange={e=>setDeviceForm({...deviceForm, ip: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-orange-500 outline-none" placeholder="Ej. 10.0.0.5" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-300 block mb-1">Dirección MAC:</label>
                  <input type="text" value={deviceForm.mac || ""} onChange={e=>setDeviceForm({...deviceForm, mac: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-orange-500 outline-none" placeholder="AA:BB:CC..." />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-300 block mb-1">Marca:</label>
                  <input type="text" required value={deviceForm.marca || ""} onChange={e=>setDeviceForm({...deviceForm, marca: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-orange-500 outline-none" placeholder="Ej. Cisco" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-300 block mb-1">Modelo / Ref:</label>
                  <input type="text" required value={deviceForm.modelo || ""} onChange={e=>setDeviceForm({...deviceForm, modelo: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-orange-500 outline-none" placeholder="Ej. C9200L" />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-300 block mb-1">Tamaño en el Rack (Unidades U):</label>
                <input type="number" min="1" max="42" required value={deviceForm.unidadesU || 1} onChange={e=>setDeviceForm({...deviceForm, unidadesU: Number(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-orange-500 outline-none" placeholder="Ej. 1" />
              </div>
              
              <div>
                <label className="text-sm font-semibold text-gray-300 block mb-2">Ubicación Física:</label>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowMapModal(true)} className={`flex-1 flex items-center justify-center py-3 rounded-lg border font-semibold transition-colors ${deviceForm.mapCoords ? 'bg-orange-600/20 text-orange-300 border-orange-500' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'}`}>
                    {deviceForm.mapCoords ? "📍 Ubicación Guardada" : "📍 Ubicar en el Plano"}
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex gap-4 mt-2">
                <button type="button" onClick={() => setShowDeviceModal(false)} className="w-1/2 py-3 bg-transparent border border-gray-600 text-gray-400 hover:bg-white/5 rounded-lg transition-colors font-bold">Cancelar</button>
                <button type="submit" disabled={isSavingDevice} className="w-1/2 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg transition-colors disabled:opacity-50">
                  {isSavingDevice ? "Guardando..." : "Guardar Equipo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal del Plano Interactivo para Panel */}
      {showMapModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="bg-[#0a0a0a] border border-orange-500/30 p-4 md:p-6 rounded-xl w-full max-w-5xl max-h-[95vh] flex flex-col shadow-[0_0_50px_rgba(234,88,12,0.15)]">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg md:text-xl font-bold text-orange-400">Seleccionar Ubicación en Plano</h3>
              <button type="button" onClick={() => setShowMapModal(false)} className="text-gray-400 hover:text-white text-2xl leading-none">✕</button>
            </div>
            
            <div className="flex-1 overflow-hidden bg-[#111] rounded-lg border border-white/10 relative flex justify-center items-center shadow-inner">
              <TransformWrapper
                initialScale={1}
                minScale={0.5}
                maxScale={10}
                centerOnInit={true}
                wheel={{ step: 0.1 }}
                pinch={{ step: 5 }}
                doubleClick={{ disabled: true }}
              >
                {({ zoomIn, zoomOut, state }) => (
                  <div className="flex flex-col w-full h-full">
                    <div className="flex-1 overflow-hidden w-full h-full cursor-grab active:cursor-grabbing">
                      <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
                        <div 
                          className="relative inline-block touch-none"
                          onTouchStartCapture={(e) => {
                            if (e.touches.length === 1) {
                              e.currentTarget.dataset.startX = String(e.touches[0].clientX);
                              e.currentTarget.dataset.startY = String(e.touches[0].clientY);
                            }
                          }}
                          onTouchEndCapture={(e) => {
                            if (e.changedTouches.length === 1) {
                              const startX = parseFloat(e.currentTarget.dataset.startX || "0");
                              const startY = parseFloat(e.currentTarget.dataset.startY || "0");
                              const touch = e.changedTouches[0];
                              
                              if (Math.abs(touch.clientX - startX) > 25 || Math.abs(touch.clientY - startY) > 25) {
                                return;
                              }
                              
                              const rect = e.currentTarget.getBoundingClientRect();
                              const x = ((touch.clientX - rect.left) / rect.width) * 100;
                              const y = ((touch.clientY - rect.top) / rect.height) * 100;
                              setDeviceForm(prev => ({ ...prev, mapCoords: { x, y } }));
                            }
                          }}
                          onClickCapture={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = ((e.clientX - rect.left) / rect.width) * 100;
                            const y = ((e.clientY - rect.top) / rect.height) * 100;
                            setDeviceForm(prev => ({ ...prev, mapCoords: { x, y } }));
                          }}
                        >
                          <img src="/plano_hospital.webp" alt="Plano del Hospital" className="w-full max-w-[800px] h-auto block pointer-events-none" />
                          
                          {deviceForm.mapCoords && (
                            <div 
                              className="absolute flex items-center justify-center pointer-events-none transition-all"
                              style={{ 
                                left: `calc(${deviceForm.mapCoords.x}% - 8px)`, 
                                top: `calc(${deviceForm.mapCoords.y}% - 8px)`,
                                transform: `scale(${1 / state.scale})`
                              }}
                            >
                              <div className="w-4 h-4 bg-orange-500 rounded-full border-2 border-white shadow-[0_0_8px_rgba(249,115,22,1)]"></div>
                            </div>
                          )}
                        </div>
                      </TransformComponent>
                    </div>

                    {/* Controles y Botones Inferiores */}
                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10 px-2 shrink-0">
                      <div className="flex items-center gap-2 bg-black/40 rounded-lg p-1 border border-white/10">
                        <button type="button" onClick={() => zoomOut()} className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 rounded font-bold text-xl transition-colors">-</button>
                        <span className="text-white text-sm font-bold min-w-[40px] text-center">{Math.round(state.scale * 100)}%</span>
                        <button type="button" onClick={() => zoomIn()} className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 rounded font-bold text-xl transition-colors">+</button>
                      </div>

                      <div className="flex gap-3">
                        <button type="button" onClick={() => setDeviceForm(prev => ({ ...prev, mapCoords: null }))} className="px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors font-semibold text-sm">
                          Borrar Marca
                        </button>
                        <button type="button" onClick={() => setShowMapModal(false)} className="px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg transition-colors text-sm">
                          Confirmar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </TransformWrapper>
            </div>
          </div>
        </div>
      )}
      {/* ==============================================
          VISTA 5: GABINETES (RACK BUILDER) - Solo Ingenieros
          ============================================== */}
      {activeTab === "gabinetes" && currentUserRole === 'ingeniero' && (
        <div className="bg-black/40 backdrop-blur-md border border-white/10 p-6 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.3)]">
          {!activeGabinete ? (
            // Lista de Gabinetes
            <>
              <div className="flex flex-col sm:flex-row justify-between items-center mb-6 border-b border-white/10 pb-4">
                <h2 className="text-2xl font-bold text-indigo-400">Gabinetes de Telecomunicaciones</h2>
                <button 
                  onClick={() => {
                    setGabineteForm({ nombre: "", ubicacion: "", unidades: 42 });
                    setShowGabineteModal(true);
                  }} 
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-[0_0_15px_rgba(79,70,229,0.3)]"
                >
                  ➕ Nuevo Gabinete
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loadingGabinetes ? (
                  <p className="text-indigo-400">Cargando gabinetes...</p>
                ) : gabinetes.length === 0 ? (
                  <p className="text-gray-500">No hay gabinetes registrados.</p>
                ) : (
                  gabinetes.map(gab => (
                    <div key={gab.id} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-indigo-500/50 transition-colors group">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-white">{gab.nombre}</h3>
                          <p className="text-sm text-gray-400">{gab.ubicacion}</p>
                        </div>
                        <span className="bg-indigo-500/20 text-indigo-300 text-xs font-bold px-2 py-1 rounded">
                          {gab.unidades}U
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center mt-6">
                        <button 
                          onClick={() => setActiveGabinete(gab)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded font-bold text-sm transition-colors"
                        >
                          Abrir Rack Builder
                        </button>
                        <button 
                          onClick={() => handleDeleteGabinete(gab.id)}
                          className="text-red-400 hover:text-red-300 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            // Rack Builder View (Optimized with dnd-kit & Optimistic UI)
            <RackBuilder
              activeGabinete={activeGabinete}
              dispositivos={dispositivos}
              onAssign={handleAssignDeviceToU}
              onRemove={handleRemoveDeviceFromU}
              onClose={() => setActiveGabinete(null)}
            />
          )}
        </div>
      )}

      {/* ================================================== */}
      {/* PESTAÑA: TAREAS DIARIAS */}
      {/* ================================================== */}
      {activeTab === "tareas" && currentUserRole === 'ingeniero' && (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex justify-between items-center bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Gestión de Tareas Diarias</h2>
              <p className="text-gray-400 text-sm">Asigna y supervisa las tareas operativas de los técnicos.</p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowAbonoMasivoModal(true)} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-[0_0_15px_rgba(147,51,234,0.4)] flex items-center gap-2">
                💰 Abono Masivo
              </button>
              <button onClick={() => setShowTareaModal(true)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] flex items-center gap-2">
                + Asignar Nueva Tarea
              </button>
            </div>
          </div>

          {loadingTareas ? (
            <div className="flex justify-center p-12">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10">
                      <th className="p-4 font-bold text-gray-300">Título</th>
                      <th className="p-4 font-bold text-gray-300">Asignado a</th>
                      <th className="p-4 font-bold text-gray-300">Importancia & Fecha</th>
                      <th className="p-4 font-bold text-gray-300">Estado de Pago</th>
                      <th className="p-4 font-bold text-gray-300">Estado</th>
                      <th className="p-4 font-bold text-gray-300 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tareas.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-500">No hay tareas asignadas.</td>
                      </tr>
                    ) : (
                      tareas.map(tarea => (
                        <tr key={tarea.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="p-4">
                            <div className="text-white font-bold">{tarea.titulo}</div>
                            <div className="text-gray-500 text-xs mt-1 truncate max-w-[250px]">{tarea.descripcion}</div>
                          </td>
                          <td className="p-4">
                            <span className="text-gray-400 text-sm">{tarea.asignado_a}</span>
                          </td>
                          <td className="p-4 flex flex-col gap-1 items-start">
                            {tarea.importancia && (
                              <span className={`px-2 py-1 rounded text-xs font-bold ${tarea.importancia === 'Urgente' ? 'bg-red-500/20 text-red-400' : tarea.importancia === 'Alta' ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-500/20 text-gray-300'}`}>
                                {tarea.importancia}
                              </span>
                            )}
                            {tarea.fecha_programada && (
                              <span className="text-xs text-cyan-400 font-semibold bg-cyan-900/30 px-2 py-1 rounded">
                                📅 {new Date(tarea.fecha_programada).toLocaleString()}
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <select 
                              value={tarea.estado_pago || 'Se debe'} 
                              onChange={(e) => handleUpdatePagoTarea(tarea.id, e.target.value)}
                              className={`px-3 py-1 rounded text-xs font-bold outline-none border border-white/10 cursor-pointer
                                ${tarea.estado_pago === 'Pago totalmente' ? 'bg-green-500/20 text-green-400' 
                                : tarea.estado_pago === 'Abonado' ? 'bg-blue-500/20 text-blue-400' 
                                : 'bg-red-500/20 text-red-400'}`}
                            >
                              <option value="Se debe" className="bg-[#111] text-red-400">Se debe</option>
                              <option value="Abonado" className="bg-[#111] text-blue-400">Abonado</option>
                              <option value="Pago totalmente" className="bg-[#111] text-green-400">Pago totalmente</option>
                            </select>
                            {tarea.estado_pago === 'Pago totalmente' && tarea.fecha_pago_total && (
                              <div className="text-[10px] text-green-400 mt-2 font-medium">Pagado el:<br/>{new Date(tarea.fecha_pago_total).toLocaleString()}</div>
                            )}
                            {(tarea.estado_pago === 'Abonado' || tarea.estado_pago === 'Se debe') && tarea.valor_total && (
                              <div className="text-xs text-gray-400 mt-2 font-medium">Total: {tarea.valor_total}</div>
                            )}
                            {tarea.estado_pago === 'Abonado' && tarea.valor_abono && (
                              <div className="text-xs text-blue-400 mt-1 font-medium">Abonado: {tarea.valor_abono}</div>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold
                              ${tarea.estado === 'Completada' ? 'bg-green-500/20 text-green-400' 
                              : tarea.estado === 'En Progreso' ? 'bg-blue-500/20 text-blue-400' 
                              : tarea.estado === 'Pausada' ? 'bg-purple-500/20 text-purple-400'
                              : 'bg-yellow-500/20 text-yellow-400'}`}>
                              {tarea.estado}
                            </span>
                          </td>
                          <td className="p-4 flex gap-2 justify-center">
                            {(tarea.evidencias_fotos?.length > 0 || tarea.evidencia_foto_1) && (
                              <button onClick={() => setViewEvidenciaTarea(tarea)} className="p-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors border border-green-500/20" title="Ver Evidencia">
                                📸 Ver
                              </button>
                            )}
                            <button onClick={() => handleDeleteTarea(tarea.id)} className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/20" title="Eliminar">
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Crear Gabinete */}
      {showGabineteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#0a0a0a] border border-indigo-500/30 p-6 rounded-2xl w-full max-w-sm shadow-[0_0_50px_rgba(79,70,229,0.15)]">
            <h2 className="text-2xl font-bold text-indigo-400 mb-4">Nuevo Gabinete</h2>
            <form onSubmit={handleSaveGabinete} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-300 block mb-1">Nombre Identificador:</label>
                <input type="text" required value={gabineteForm.nombre} onChange={e=>setGabineteForm({...gabineteForm, nombre: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-indigo-500 outline-none" placeholder="Ej. Gabinete P1" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-300 block mb-1">Ubicación (Cuarto):</label>
                <input type="text" value={gabineteForm.ubicacion} onChange={e=>setGabineteForm({...gabineteForm, ubicacion: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-indigo-500 outline-none" placeholder="Ej. Data Center Principal" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-300 block mb-1">Tamaño en U:</label>
                <select value={gabineteForm.unidades} onChange={e=>setGabineteForm({...gabineteForm, unidades: Number(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-indigo-500 outline-none">
                  <option value={12}>12U (Pequeño)</option>
                  <option value={24}>24U (Mediano)</option>
                  <option value={42}>42U (Estándar)</option>
                  <option value={45}>45U (Alto)</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowGabineteModal(false)} className="w-1/2 py-2 border border-gray-600 text-gray-400 hover:bg-white/5 rounded-lg font-bold">Cancelar</button>
                <button type="submit" className="w-1/2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Asignar Tarea */}
      {showTareaModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#0a0a0a] border border-blue-500/30 p-6 rounded-2xl w-full max-w-md shadow-[0_0_50px_rgba(37,99,235,0.15)]">
            <h2 className="text-2xl font-bold text-blue-400 mb-4">Asignar Nueva Tarea</h2>
            <form onSubmit={handleSaveTarea} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-300 block mb-1">Título de la Tarea:</label>
                <input type="text" required value={tareaForm.titulo} onChange={e=>setTareaForm({...tareaForm, titulo: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none" placeholder="Ej. Revisión de cableado..." />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-300 block mb-1">Descripción detallada:</label>
                <textarea required value={tareaForm.descripcion} onChange={e=>setTareaForm({...tareaForm, descripcion: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none min-h-[100px]" placeholder="Instrucciones para el técnico..." />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-300 block mb-1">Asignar a (Email):</label>
                <select value={tareaForm.asignado_a} onChange={e=>setTareaForm({...tareaForm, asignado_a: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none">
                  <option value="Todos">Abierto (Cualquier Técnico)</option>
                  {usuarios.filter((u: any) => u.role === 'tecnico').map((u: any) => (
                    <option key={u.email} value={u.email}>{u.nombre} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-4">
                <div className="w-full">
                  <label className="text-sm font-semibold text-gray-300 block mb-1">Importancia:</label>
                  <select value={tareaForm.importancia} onChange={e=>setTareaForm({...tareaForm, importancia: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none">
                    <option value="Baja">Baja</option>
                    <option value="Media">Media</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente 🚨</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowTareaModal(false)} className="w-1/2 py-2 border border-gray-600 text-gray-400 hover:bg-white/5 rounded-lg font-bold">Cancelar</button>
                <button type="submit" disabled={isSavingTarea} className={`w-1/2 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors ${isSavingTarea ? 'opacity-50' : ''}`}>{isSavingTarea ? 'Guardando...' : 'Asignar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Abono Masivo */}
      {showAbonoMasivoModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#0a0a0a] border border-purple-500/30 p-6 rounded-2xl w-full max-w-sm shadow-[0_0_50px_rgba(147,51,234,0.15)]">
            <h2 className="text-2xl font-bold text-purple-400 mb-4">Abono Masivo</h2>
            <p className="text-sm text-gray-400 mb-4">Ingresa el monto del abono. El sistema descontará automáticamente las deudas de las tareas más antiguas primero.</p>
            <form onSubmit={handleAbonoMasivo} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-300 block mb-1">Monto del Abono:</label>
                <input type="text" required value={abonoMasivoAmount} onChange={e=>setAbonoMasivoAmount(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-purple-500 outline-none" placeholder="Ej. 500000" />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowAbonoMasivoModal(false)} className="w-1/2 py-2 border border-gray-600 text-gray-400 hover:bg-white/5 rounded-lg font-bold">Cancelar</button>
                <button type="submit" disabled={isProcessingAbono} className={`w-1/2 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors ${isProcessingAbono ? 'opacity-50' : ''}`}>{isProcessingAbono ? 'Procesando...' : 'Aplicar Abono'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ver Evidencia de Tarea */}
      {viewEvidenciaTarea && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-green-500/30 p-6 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-[0_0_50px_rgba(34,197,94,0.15)] relative">
            <button onClick={() => setViewEvidenciaTarea(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white bg-black/50 p-2 rounded-full">✕</button>
            
            <h2 className="text-2xl font-bold text-green-400 mb-2">{viewEvidenciaTarea.titulo}</h2>
            <div className="flex gap-2 mb-4">
              <span className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded">Por: {viewEvidenciaTarea.ejecutado_por || viewEvidenciaTarea.asignado_a}</span>
              {viewEvidenciaTarea.fecha_completada && (
                <span className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded">El: {new Date(viewEvidenciaTarea.fecha_completada).toLocaleDateString()}</span>
              )}
            </div>

            <div className="bg-black/50 p-4 rounded-xl border border-white/5 mb-6 text-sm text-gray-300">
              <strong className="text-white block mb-1">Notas del Técnico:</strong>
              {viewEvidenciaTarea.notas_tecnico || "Sin comentarios."}
            </div>

            {(viewEvidenciaTarea.evidencias_fotos?.length > 0 || viewEvidenciaTarea.evidencia_foto_1) && (
              <div>
                <strong className="text-white block mb-2">Evidencia Fotográfica:</strong>
                <div className="flex flex-col gap-4">
                  {viewEvidenciaTarea.evidencias_fotos?.length > 0 
                    ? viewEvidenciaTarea.evidencias_fotos.map((foto: string, idx: number) => (
                        <img key={idx} src={foto} alt={`Evidencia ${idx + 1}`} className="w-full rounded-xl border border-white/10" />
                      ))
                    : <img src={viewEvidenciaTarea.evidencia_foto_1} alt="Evidencia" className="w-full rounded-xl border border-white/10" />
                  }
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}