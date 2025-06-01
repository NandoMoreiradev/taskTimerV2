import { initFirebase, createTaskInFirestore } from './firebaseService.js';
import { showMessage } from './ui.js';
import { getCloseSubtaskModalButton, getSubtaskModal, getSubtaskLoadingIndicator, getSubtaskErrorStateElement, getSuggestedSubtasksListElement } from './geminiService.js';

// Elementos DOM principais para este módulo
const taskForm = document.getElementById('taskForm');
const taskInput = document.getElementById('taskInput');

// Elementos do Modal de Subtarefas (obtidos do geminiService para consistência)
const closeSubtaskModalButton = getCloseSubtaskModalButton();
const subtaskModal = getSubtaskModal();
const subtaskLoadingIndicator = getSubtaskLoadingIndicator(); // Loading interno do modal
const subtaskErrorState = getSubtaskErrorStateElement();
const suggestedSubtasksList = getSuggestedSubtasksListElement();


async function handleTaskFormSubmit(event) {
    event.preventDefault();
    const description = taskInput.value.trim();
    if (!description) {
        showMessage("A descrição da tarefa não pode estar vazia.", "error");
        return;
    }
    const success = await createTaskInFirestore(description);
    if (success) {
        taskInput.value = '';
    }
}

// --- Inicialização e Event Listeners ---
if (taskForm) {
    taskForm.addEventListener('submit', handleTaskFormSubmit);
} else {
    console.error("Elemento taskForm não encontrado.");
}

if (closeSubtaskModalButton && subtaskModal && subtaskLoadingIndicator && subtaskErrorState && suggestedSubtasksList) {
    closeSubtaskModalButton.onclick = () => {
        subtaskModal.classList.add('hidden');
        subtaskLoadingIndicator.classList.add('hidden'); // Esconde loading interno
        subtaskErrorState.classList.add('hidden');     // Esconde estado de erro
        suggestedSubtasksList.innerHTML = '';          // Limpa lista
    };
} else {
    console.error("Um ou mais elementos do modal de subtarefas não foram encontrados.");
}

// Inicia o Firebase (que por sua vez lida com autenticação e carregamento de tarefas)
initFirebase();