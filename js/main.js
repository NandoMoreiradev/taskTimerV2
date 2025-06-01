// js/main.js

import { initFirebase, createTaskInFirestore, loadTasksWithOptions } from './firebaseService.js';
import { showMessage } from './ui.js';
import { 
    getCloseSubtaskModalButton, 
    getSubtaskModal, 
    getSubtaskLoadingIndicator as getSubtaskLoadingIndicatorModal, // Alias para clareza
    getSubtaskErrorStateElement, 
    getSuggestedSubtasksListElement
    // Getters para detailedDescriptionModal foram removidos
} from './geminiService.js';

// --- Seletores de Elementos DOM Principais ---
const taskForm = document.getElementById('taskForm');
const taskInput = document.getElementById('taskInput');
const taskPriorityInput = document.getElementById('taskPriority');
const taskDueDateInput = document.getElementById('taskDueDate');

const filterStatusElement = document.getElementById('filterStatus');
const filterPriorityElement = document.getElementById('filterPriority');
const sortTasksElement = document.getElementById('sortTasks');

console.log("main.js - carregamento inicial - filterStatusElement:", filterStatusElement);
console.log("main.js - carregamento inicial - filterPriorityElement:", filterPriorityElement);
console.log("main.js - carregamento inicial - sortTasksElement:", sortTasksElement);

// Elementos do Modal de Subtarefas
const closeSubtaskModalBtn = getCloseSubtaskModalButton();
const subtaskMod = getSubtaskModal();
const subtaskLoadingMod = getSubtaskLoadingIndicatorModal(); // Usando alias
const subtaskErrorStateMod = getSubtaskErrorStateElement();
const suggestedSubtasksListMod = getSuggestedSubtasksListElement();

// --- Estado para Filtros e Ordenação ---
let currentFilters = { status: 'todas', priority: 'todas' };
let currentSort = { field: 'createdAt', direction: 'desc' };

// --- Funções ---
function applyFiltersAndSort() {
    console.log("main.js: DENTRO de applyFiltersAndSort - Iniciando execução (LOG D)");
    console.log("main.js: DENTRO de applyFiltersAndSort - filterStatusElement:", filterStatusElement, (filterStatusElement ? "ENCONTRADO" : "NULO/FALSY"));
    console.log("main.js: DENTRO de applyFiltersAndSort - filterPriorityElement:", filterPriorityElement, (filterPriorityElement ? "ENCONTRADO" : "NULO/FALSY"));
    console.log("main.js: DENTRO de applyFiltersAndSort - sortTasksElement:", sortTasksElement, (sortTasksElement ? "ENCONTRADO" : "NULO/FALSY"));

    if (!filterStatusElement || !filterPriorityElement || !sortTasksElement) {
        console.error("main.js: ERRO INTERNO EM applyFiltersAndSort - Um ou mais elementos de filtro/ordenação são NULOS ou UNDEFINED aqui.");
        // Se precisar parar o loading aqui, precisaria importar showLoading de ui.js
        // import { showLoading } from './ui.js'; // Adicionar no topo se usar
        // if (typeof showLoading === 'function') showLoading(false);
        return;
    }
    console.log("main.js: DENTRO de applyFiltersAndSort - Elementos de filtro/ordenação VALIDADOS. Prosseguindo... (LOG H)");

    const selectedSortValue = sortTasksElement.value;
    const [sortField, sortDirection] = selectedSortValue.split('_');
    
    currentFilters.status = filterStatusElement.value;
    currentFilters.priority = filterPriorityElement.value;
    currentSort.field = sortField;
    currentSort.direction = sortDirection;

    console.log("main.js: Filtros e ordenação atuais:", currentFilters, currentSort);
    loadTasksWithOptions(currentFilters, currentSort);
    console.log("main.js: applyFiltersAndSort chamou loadTasksWithOptions");
}

async function handleTaskFormSubmit(event) {
    event.preventDefault();
    if (!taskInput || !taskPriorityInput || !taskDueDateInput) {
        console.error("Elementos do formulário de tarefa não encontrados.");
        showMessage("Erro no formulário. Tente recarregar a página.", "error");
        return;
    }
    const description = taskInput.value.trim();
    const priority = taskPriorityInput.value;
    const dueDate = taskDueDateInput.value;

    if (!description) {
        showMessage("A descrição da tarefa não pode estar vazia.", "error");
        return;
    }
    const success = await createTaskInFirestore(description, priority, dueDate);
    if (success) {
        taskInput.value = '';
        taskDueDateInput.value = ''; 
        taskPriorityInput.value = 'media'; 
    }
}

// --- Configuração de Event Listeners ---
if (taskForm) {
    taskForm.addEventListener('submit', handleTaskFormSubmit);
} else {
    console.error("Elemento taskForm (formulário de adicionar tarefa) não encontrado no DOM.");
}

if (filterStatusElement) {
    filterStatusElement.addEventListener('change', applyFiltersAndSort);
} else {
    console.warn("Elemento filterStatusElement não encontrado no DOM. Filtro por status não funcionará.");
}

if (filterPriorityElement) {
    filterPriorityElement.addEventListener('change', applyFiltersAndSort);
} else {
    console.warn("Elemento filterPriorityElement não encontrado no DOM. Filtro por prioridade não funcionará.");
}

if (sortTasksElement) {
    sortTasksElement.addEventListener('change', applyFiltersAndSort);
} else {
    console.warn("Elemento sortTasksElement não encontrado no DOM. Ordenação não funcionará.");
}

// Listener para o modal de subtarefas
if (closeSubtaskModalBtn && subtaskMod) {
    closeSubtaskModalBtn.onclick = () => {
        subtaskMod.classList.add('hidden');
        if(subtaskLoadingMod) subtaskLoadingMod.classList.add('hidden');
        if(subtaskErrorStateMod) subtaskErrorStateMod.classList.add('hidden');
        if(suggestedSubtasksListMod) suggestedSubtasksListMod.innerHTML = '';
    };
} else {
    // Este console.warn corresponde ao erro que você estava vendo sobre elementos do modal
    console.warn("Elementos do modal de SUBTAREFAS (botão de fechar ou o próprio modal) não encontrados para configurar o listener em main.js. Verifique os IDs e a função getCloseSubtaskModalButton em geminiService.js.");
}

// Listener para o modal de descrição detalhada FOI REMOVIDO

// --- Inicialização da Aplicação ---
initFirebase(applyFiltersAndSort);