import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js"; // Removido signInWithCustomToken
import { getFirestore, doc, addDoc, deleteDoc, onSnapshot, collection, query, serverTimestamp, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { showLoading, showMessage, renderTask, updateUserInfoText, clearTaskList, displayNoTasksMessage, removeNoTasksMessage, getTaskListElement } from './ui.js';
import { pauseLocalTimer, removeTaskTimer, getTaskTimerState, initializeTaskTimer } from './timer.js';

// Configuração do Firebase e appId customizado
const firebaseConfig = {
    apiKey: "AIzaSyCfnPkROxNQP9p7wCrHO4ElcoNfPJNQFTA",
    authDomain: "task-timer-ai.firebaseapp.com",
    projectId: "task-timer-ai",
    storageBucket: "task-timer-ai.firebasestorage.app",
    messagingSenderId: "627092623866",
    appId: "1:627092623866:web:461b9338a59e2281cd5443"
};
const customAppId = 'task-timer-ai'; // appId customizado

// Variáveis de módulo para instâncias e estado do Firebase
let app;
let auth;
let db;
let userId;
let tasksCollectionRef;
let tasksUnsubscribe = null;

export async function initFirebase() {
    if (!firebaseConfig) {
        console.error("Configuração do Firebase não encontrada!");
        showMessage("Erro de configuração. App não pode iniciar.", "error");
        updateUserInfoText("Erro de configuração do Firebase.");
        return;
    }

    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        await setPersistence(auth, browserLocalPersistence);

        onAuthStateChanged(auth, async (user) => {
            showLoading(true, "Autenticando...");
            if (user) {
                userId = user.uid;
                updateUserInfoText(`Logado como: ${userId.substring(0, 10)}...`);
                tasksCollectionRef = collection(db, `artifacts/${customAppId}/users/${userId}/tasks`);
                loadTasks();
            } else {
                try {
                    await signInAnonymously(auth);
                } catch (error) {
                    console.error("Erro no login anônimo:", error);
                    showMessage("Falha na autenticação. Verifique o console.", "error");
                    updateUserInfoText("Falha na autenticação.");
                    showLoading(false);
                }
            }
        });

    } catch (error) {
        console.error("Erro ao inicializar Firebase:", error);
        showMessage("Erro crítico ao iniciar o app.", "error");
        updateUserInfoText("Falha ao conectar com Firebase.");
        showLoading(false);
    }
}

export async function createTaskInFirestore(description) {
    if (!userId || !tasksCollectionRef) {
        showMessage("Usuário não autenticado ou coleção não definida.", "error");
        return false;
    }
    showLoading(true, "Adicionando tarefa...");
    try {
        const newTask = {
            description: description,
            isCompleted: false,
            timeSpent: 0,
            isRunning: false,
            createdAt: serverTimestamp(),
            userId: userId 
        };
        await addDoc(tasksCollectionRef, newTask);
        showMessage(`Tarefa "${description.substring(0,20).trimEnd()}..." adicionada!`, "success");
        return true;
    } catch (error) {
        console.error("Erro ao adicionar tarefa:", error);
        showMessage("Erro ao adicionar tarefa.", "error");
        return false;
    } finally {
        showLoading(false);
    }
}

export async function toggleCompleteTask(taskId, isCompleted) {
    if (!userId || !tasksCollectionRef) return;
    const taskDocRef = doc(tasksCollectionRef, taskId);
    showLoading(true, "Atualizando tarefa...");
    try {
        await updateDoc(taskDocRef, { isCompleted: isCompleted });
        if (isCompleted) {
            const timerState = getTaskTimerState(taskId);
            if (timerState && timerState.isRunning) {
                pauseLocalTimer(taskId); // Pausa o timer local
                await updateTimerStateInFirestore(taskId, timerState.timeSpent, false); // Atualiza no Firestore
            }
        }
        showMessage(isCompleted ? "Tarefa concluída!" : "Tarefa reaberta!", "success");
    } catch (error) {
        console.error("Erro ao atualizar tarefa:", error);
        showMessage("Erro ao atualizar tarefa.", "error");
    } finally {
        showLoading(false);
    }
}

export async function deleteTask(taskId) {
    if (!userId || !tasksCollectionRef) return;
    showLoading(true, "Excluindo tarefa...");
    try {
        const taskDocRef = doc(tasksCollectionRef, taskId);
        await deleteDoc(taskDocRef);
        removeTaskTimer(taskId); // Remove o timer local associado
        showMessage("Tarefa excluída com sucesso!", "success");
    } catch (error) {
        console.error("Erro ao deletar tarefa:", error);
        showMessage("Erro ao deletar tarefa.", "error");
    } finally {
        showLoading(false);
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

function loadTasks() {
    if (!userId || !tasksCollectionRef) return;
    showLoading(true, "Carregando tarefas...");

    if (tasksUnsubscribe) tasksUnsubscribe(); // Cancela listener anterior, se houver

    const q = query(tasksCollectionRef); 
    
    tasksUnsubscribe = onSnapshot(q, (querySnapshot) => {
        const currentTasksOnPage = new Set();
        
        
        querySnapshot.forEach((docSnapshot) => {
            const task = { id: docSnapshot.id, ...docSnapshot.data() };
            // Garante que timers sejam inicializados ou atualizados com dados do Firestore
            initializeTaskTimer(task.id, task.timeSpent || 0, task.isRunning || false);
            renderTask(task); // ui.js fará o render ou update
            currentTasksOnPage.add(task.id);
        });

        const taskListElement = getTaskListElement();
        if (taskListElement) {
            Array.from(taskListElement.children).forEach(child => {
                const childId = child.dataset.id;
                if (childId && !currentTasksOnPage.has(childId) && child.classList.contains('task-card') ) { // Verifica se é um task-card
                    child.remove();
                    removeTaskTimer(childId); // Limpa timer local
                }
            });

            if (querySnapshot.empty && taskListElement.children.length === 0) { // Verifica se realmente está vazio
                displayNoTasksMessage();
            } else if (!querySnapshot.empty) {
                removeNoTasksMessage();
            }
        }
        showLoading(false);
    }, (error) => {
        console.error("Erro ao carregar tarefas:", error);
        showMessage("Erro ao carregar tarefas.", "error");
        showLoading(false);
    });
}