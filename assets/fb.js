// Firebase da loja (projeto ekklesia-loja): contas de cliente e pedidos.
// A configuração abaixo é pública por natureza (identifica o projeto); quem
// protege os dados são as regras do banco (firestore.rules).
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, sendPasswordResetEmail, updateProfile, sendEmailVerification,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  getFirestore, doc, getDoc, setDoc, addDoc, collection, query, where, getDocs, onSnapshot, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const app = initializeApp({
  apiKey: 'AIzaSyBsRilnRr--ay_nQhCobwY9tAhlxficYKg',
  authDomain: 'ekklesia-loja.firebaseapp.com',
  projectId: 'ekklesia-loja',
  storageBucket: 'ekklesia-loja.firebasestorage.app',
  messagingSenderId: '189659970433',
  appId: '1:189659970433:web:4616ad777166571aac8680',
});
const auth = getAuth(app);
auth.languageCode = 'pt';
const db = getFirestore(app);

export const STATUS = [
  ['aguardando_pagamento', 'Aguardando pagamento'],
  ['entrada_paga', 'Entrada paga'],
  ['pago', 'Pagamento completo'],
  ['em_producao', 'Em produção'],
  ['pronto', 'Pronto para envio'],
  ['enviado', 'Enviado'],
  ['entregue', 'Entregue'],
  ['cancelado', 'Cancelado'],
];
export const statusLabel = (s) => STATUS.find((x) => x[0] === s)?.[1] || s;

const MSG = {
  'auth/email-already-in-use': 'Este e-mail já tem conta. Use "Entrar".',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'Não achamos conta com esse e-mail.',
  'auth/too-many-requests': 'Muitas tentativas. Espere um pouco e tente de novo.',
  'auth/network-request-failed': 'Sem internet no momento.',
};
const friendly = (e) => new Error(MSG[e.code] || e.message);
const wrap = async (fn) => { try { return await fn(); } catch (e) { throw friendly(e); } };

// ---------- conta ----------
export const currentUser = () => auth.currentUser;
export const onUser = (fn) => onAuthStateChanged(auth, fn);
export const entrar = (email, senha) => wrap(() => signInWithEmailAndPassword(auth, email.trim(), senha));
export const sair = () => signOut(auth);
export const esqueci = (email) => wrap(() => sendPasswordResetEmail(auth, email.trim()));
export async function criarConta({ nome, whats, email, senha }) {
  return wrap(async () => {
    const { user } = await createUserWithEmailAndPassword(auth, email.trim(), senha);
    await updateProfile(user, { displayName: nome });
    await setDoc(doc(db, 'clientes', user.uid), { nome, whats, email: user.email, criadoEm: serverTimestamp() }, { merge: true });
    sendEmailVerification(user).catch(() => {});
    return user;
  });
}
export async function perfil() {
  const u = auth.currentUser;
  if (!u) return null;
  const s = await getDoc(doc(db, 'clientes', u.uid));
  return { email: u.email, nome: u.displayName || '', ...(s.exists() ? s.data() : {}) };
}
export async function salvarPerfil(dados) {
  const u = auth.currentUser;
  if (!u) return;
  await setDoc(doc(db, 'clientes', u.uid), { ...dados, email: u.email, atualizadoEm: serverTimestamp() }, { merge: true });
}

// ---------- pedidos ----------
export async function criarPedido(p) {
  const u = auth.currentUser;
  const now = Date.now();
  const ref = await addDoc(collection(db, 'pedidos'), {
    ...p, uid: u ? u.uid : null, email: u?.email || p.cliente?.email || '',
    status: 'aguardando_pagamento', pago: 0, pagamentos: [], historico: [{ status: 'aguardando_pagamento', at: now }],
    prazoEntrega: null, rastreio: '', criadoEm: serverTimestamp(), criadoMs: now,
  });
  return ref.id;
}
export const pedido = async (id) => { const s = await getDoc(doc(db, 'pedidos', id)); return s.exists() ? { id, ...s.data() } : null; };
export const acompanhar = (id, fn) => onSnapshot(doc(db, 'pedidos', id), (s) => fn(s.exists() ? { id, ...s.data() } : null), () => fn(undefined));
export async function meusPedidos() {
  const u = auth.currentUser;
  if (!u) return [];
  const s = await getDocs(query(collection(db, 'pedidos'), where('uid', '==', u.uid)));
  return s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.criadoMs || 0) - (a.criadoMs || 0));
}
