// js/firebaseService.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, addDoc, deleteDoc, onSnapshot, collection, query, serverTimestamp, updateDoc, orderBy, where, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js"; // Adicionado getDocs

import { showLoading, showMessage, renderTask, updateUserInfoText, clearTaskList, displayNoTasksMessage, removeNoTasksMessage, getTaskListElement } from './ui.js';
import { pauseLocalTimer, removeTaskTimer, getTaskTimerState, initializeTaskTimer } from './timer.js';

// Configuração do Firebase e appId customizado
const firebaseConfig = {
    apiKey: "AIzaSyCfnPkROxNQP9p7wCrHO4ElcoNfPJNQFTA", // Substitua pela sua chave de API real, se aplicável
    authDomain: "task-timer-ai.firebaseapp.com",
    projectId: "task-timer-ai",
    storageBucket: "task-timer-ai.firebasestorage.app",
    messagingSenderId: "627092623866",
    appId: "1:627092623866:web:461b9338a59e2281cd5443"
};
const customAppId = 'task-timer-ai'; // Seu appId customizado para estrutura de dados

// Variáveis de módulo para instâncias e estado do Firebase
let app;
let auth;
let db;
let userId;
let tasksCollectionRef;
let tasksUnsubscribe = null;

export async function initFirebase(onUserAuthenticatedCallback) {
    if (!firebaseConfig || !firebaseConfig.apiKey) { // Verificação básica da config
        console.error("Configuração do Firebase incompleta ou não encontrada!");
        if (typeof showMessage === 'function') showMessage("Erro de configuração interna. App não pode iniciar.", "error");
        if (typeof updateUserInfoText === 'function') updateUserInfoText("Erro de configuração do Firebase.");
        return;
    }
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        await setPersistence(auth, browserLocalPersistence);

        onAuthStateChanged(auth, async (user) => {
            if (typeof showLoading === 'function') showLoading(true, "Autenticando...");
            console.log("onAuthStateChanged: Status do usuário:", user ? `Logado (${user.uid})` : "Deslogado");

            if (user) {
                userId = user.uid;
                if (typeof updateUserInfoText === 'function') updateUserInfoText(`Logado como: ${userId.substring(0, 10)}...`);
                
                const pathString = `artifacts/${customAppId}/users/${userId}/tasks`;
                tasksCollectionRef = collection(db, pathString);
                
                console.log("onAuthStateChanged: Antes de chamar onUserAuthenticatedCallback");
                if (onUserAuthenticatedCallback) {
                    onUserAuthenticatedCallback(); 
                }
                console.log("onAuthStateChanged: Depois de chamar onUserAuthenticatedCallback");
            } else {
                try {
                    await signInAnonymously(auth);
                    console.log("onAuthStateChanged: signInAnonymously chamado, aguardando novo estado de auth...");
                } catch (error) {
                    console.error("Erro no login anônimo:", error);
                    if (typeof showMessage === 'function') showMessage("Falha na autenticação. Verifique o console.", "error");
                    if (typeof updateUserInfoText === 'function') updateUserInfoText("Falha na autenticação.");
                    if (typeof showLoading === 'function') showLoading(false);
                }
            }
        });
    } catch (error) {
        console.error("Erro ao inicializar Firebase:", error);
        if (typeof showMessage === 'function') showMessage("Erro crítico ao iniciar o app.", "error");
        if (typeof updateUserInfoText === 'function') updateUserInfoText("Falha ao conectar com Firebase.");
        if (typeof showLoading === 'function') showLoading(false);
    }
}

export async function createTaskInFirestore(description, priority, dueDate) {
    if (!userId || !tasksCollectionRef) {
        if (typeof showMessage === 'function') showMessage("Usuário não autenticado ou coleção não definida.", "error");
        return false;
    }
    if (typeof showLoading === 'function') showLoading(true, "Adicionando tarefa...");
    try {
        let priorityOrder = 2; // Média por padrão
        if (priority === 'alta') priorityOrder = 1;
        else if (priority === 'baixa') priorityOrder = 3;

        const newTask = {
            description: description,
            longDescription: "", 
            isCompleted: false,
            timeSpent: 0,
            isRunning: false,
            createdAt: serverTimestamp(),
            completedAt: null, // NOVO CAMPO INICIALIZADO
            userId: userId,
            priority: priority || 'media',
            priorityOrder: priorityOrder,
            dueDate: dueDate || null
        };
        await addDoc(tasksCollectionRef, newTask);
        if (typeof showMessage === 'function') showMessage(`Tarefa "${description.substring(0,20).trimEnd()}..." adicionada!`, "success");
        return true;
    } catch (error) {
        console.error("Erro ao adicionar tarefa:", error);
        if (typeof showMessage === 'function') showMessage("Erro ao adicionar tarefa.", "error");
        return false;
    } finally {
        if (typeof showLoading === 'function') showLoading(false);
    }
}

export async function updateTask(taskId, dataToUpdate) {
    if (!userId || !tasksCollectionRef) {
        if (typeof showMessage === 'function') showMessage("Usuário não autenticado ou coleção não definida.", "error");
        return false;
    }
    const taskDocRef = doc(tasksCollectionRef, taskId);
    if (typeof showLoading === 'function') showLoading(true, "Atualizando tarefa...");
    try {
        await updateDoc(taskDocRef, dataToUpdate);
        return true;
    } catch (error) {
        console.error("Erro ao atualizar tarefa:", error);
        if (typeof showMessage === 'function') showMessage("Erro ao atualizar tarefa.", "error");
        return false;
    } finally {
        if (typeof showLoading === 'function') showLoading(false);
    }
}

export async function toggleCompleteTask(taskId, isCompleted) {
    if (!userId || !tasksCollectionRef) return;
    const taskDocRef = doc(tasksCollectionRef, taskId);
    if (typeof showLoading === 'function') showLoading(true, "Atualizando tarefa...");
    try {
        const updateData = { 
            isCompleted: isCompleted,
            completedAt: isCompleted ? serverTimestamp() : null // ATUALIZA completedAt
        };
        await updateDoc(taskDocRef, updateData);
        
        if (isCompleted) {
            const timerState = getTaskTimerState(taskId);
            if (timerState && timerState.isRunning) {
                pauseLocalTimer(taskId);
                await updateTimerStateInFirestore(taskId, timerState.timeSpent, false);
            }
        }
        if (typeof showMessage === 'function') showMessage(isCompleted ? "Tarefa concluída!" : "Tarefa reaberta!", "success");
    } catch (error) {
        console.error("Erro ao atualizar tarefa:", error);
        if (typeof showMessage === 'function') showMessage("Erro ao atualizar tarefa.", "error");
    } finally {
        if (typeof showLoading === 'function') showLoading(false);
    }
}

export async function deleteTask(taskId) {
    if (!userId || !tasksCollectionRef) return;
    if (typeof showLoading === 'function') showLoading(true, "Excluindo tarefa...");
    try {
        const taskDocRef = doc(tasksCollectionRef, taskId);
        await deleteDoc(taskDocRef);
        removeTaskTimer(taskId);
        if (typeof showMessage === 'function') showMessage("Tarefa excluída com sucesso!", "success");
    } catch (error) {
        console.error("Erro ao deletar tarefa:", error);
        if (typeof showMessage === 'function') showMessage("Erro ao deletar tarefa.", "error");
    } finally {
        if (typeof showLoading === 'function') showLoading(false);
    }
}

export async function updateTimerStateInFirestore(taskId, timeSpent, isRunning) {
    if (!userId || !tasksCollectionRef) return;
    const taskDocRef = doc(tasksCollectionRef, taskId);
    try {
        await updateDoc(taskDocRef, { timeSpent, isRunning });
    } catch (error) {
        console.error("Erro ao atualizar estado do timer no Firestore:", error);
    }
}

export function loadTasksWithOptions(filters, sort) {
    console.log("firebaseService.js: loadTasksWithOptions iniciada com:", filters, sort);
    if (!userId || !tasksCollectionRef) {
        console.error("loadTasksWithOptions: userId ou tasksCollectionRef não definido. Saindo.");
        if (typeof showLoading === 'function') showLoading(false);
        return;
    }
    if (typeof showLoading === 'function') showLoading(true, "Carregando tarefas...");
    if (tasksUnsubscribe) tasksUnsubscribe();

    let queryConstraints = [];

    // Aplicar filtros
    if (filters.status === 'pendentes') {
        queryConstraints.push(where("isCompleted", "==", false));
    } else if (filters.status === 'concluidas') {
        queryConstraints.push(where("isCompleted", "==", true));
    }

    if (filters.priority !== 'todas') {
        queryConstraints.push(where("priority", "==", filters.priority));
    }

    // Aplicar ordenação
    if (sort.field === 'priorityOrder') { queryConstraints.push(orderBy("priorityOrder", sort.direction)); }
    else if (sort.field === 'dueDate') { queryConstraints.push(orderBy("dueDate", sort.direction)); }
    else if (sort.field === 'createdAt') { queryConstraints.push(orderBy("createdAt", sort.direction)); }
    else if (sort.field === 'description') { queryConstraints.push(orderBy("description", sort.direction));}
    else { // Ordenação padrão se nenhuma específica ou inválida
        queryConstraints.push(orderBy("createdAt", "desc"));
    }
    
    const q = query(tasksCollectionRef, ...queryConstraints);

    tasksUnsubscribe = onSnapshot(q, (querySnapshot) => {
        console.log("firebaseService.js: onSnapshot recebeu dados (ou query vazia)");
        const taskListElement = getTaskListElement();
        if (taskListElement && typeof clearTaskList === 'function') clearTaskList(); 

        querySnapshot.forEach((docSnapshot) => {
            const task = { id: docSnapshot.id, ...docSnapshot.data() };
            initializeTaskTimer(task.id, task.timeSpent || 0, task.isRunning || false);
            if (typeof renderTask === 'function') renderTask(task);
        });

        if (taskListElement) {
            if (querySnapshot.empty && taskListElement.children.length === 0) {
                if (typeof displayNoTasksMessage === 'function') displayNoTasksMessage();
            } else if (!querySnapshot.empty) {
                if (typeof removeNoTasksMessage === 'function') removeNoTasksMessage();
            }
        }
        if (typeof showLoading === 'function') showLoading(false);
    }, (error) => {
        console.error("firebaseService.js: Erro no onSnapshot:", error);
        if (typeof showMessage === 'function') showMessage("Erro ao carregar tarefas. Verifique o console para detalhes sobre índices.", "error");
        if (typeof showLoading === 'function') showLoading(false);
    });
}

// Nova função para buscar todas as tarefas para relatórios
export async function fetchAllUserTasks() {
    if (!userId || !tasksCollectionRef) {
        console.error("fetchAllUserTasks: Usuário não autenticado ou coleção não definida.");
        return []; // Retorna array vazio em caso de erro
    }
    try {
        const querySnapshot = await getDocs(tasksCollectionRef);
        const tasks = [];
        querySnapshot.forEach((doc) => {
            tasks.push({ id: doc.id, ...doc.data() });
        });
        return tasks;
    } catch (error) {
        console.error("Erro ao buscar todas as tarefas do usuário:", error);
        if (typeof showMessage === 'function') showMessage("Erro ao buscar dados para o relatório.", "error");
        return []; // Retorna array vazio em caso de erro
    }
}