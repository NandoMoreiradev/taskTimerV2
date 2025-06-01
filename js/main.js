// js/main.js

import { initFirebase, createTaskInFirestore, loadTasksWithOptions } from './firebaseService.js';
import { showMessage } from './ui.js';
import { 
    getCloseSubtaskModalButton, 
    getSubtaskModal, 
    getSubtaskLoadingIndicator as getSubtaskLoadingIndicatorModal,
    getSubtaskErrorStateElement, 
    getSuggestedSubtasksListElement
} from './geminiService.js';
import { displayReport } from './reportsService.js'; // NOVA IMPORTAÇÃO

// --- Seletores de Elementos DOM Principais ---
const taskForm = document.getElementById('taskForm');
const taskInput = document.getElementById('taskInput');
const taskPriorityInput = document.getElementById('taskPriority');
const taskDueDateInput = document.getElementById('taskDueDate');

const filterStatusElement = document.getElementById('filterStatus');
const filterPriorityElement = document.getElementById('filterPriority');
const sortTasksElement = document.getElementById('sortTasks');

// Logs para verificar elementos de filtro/ordenação (pode remover se tudo estiver ok)
console.log("main.js - carregamento inicial - filterStatusElement:", filterStatusElement);
console.log("main.js - carregamento inicial - filterPriorityElement:", filterPriorityElement);
console.log("main.js - carregamento inicial - sortTasksElement:", sortTasksElement);

// Elementos do Modal de Subtarefas
const closeSubtaskModalBtn = getCloseSubtaskModalButton();
const subtaskMod = getSubtaskModal();
const subtaskLoadingMod = getSubtaskLoadingIndicatorModal();
const subtaskErrorStateMod = getSubtaskErrorStateElement();
const suggestedSubtasksListMod = getSuggestedSubtasksListElement();

// Elementos do Modal de Relatórios (NOVOS)
const openReportsModalButton = document.getElementById('openReportsModalButton');
const closeReportsModalButton = document.getElementById('closeReportsModalButton');
const refreshReportsButton = document.getElementById('refreshReportsButton');
const reportsModalElement = document.getElementById('reportsModal');


// --- Estado para Filtros e Ordenação ---
let currentFilters = { status: 'todas', priority: 'todas' };
let currentSort = { field: 'createdAt', direction: 'desc' };

// --- Funções ---
function applyFiltersAndSort() {
    console.log("main.js: DENTRO de applyFiltersAndSort - Iniciando execução (LOG D)");
    // Verificações de elementos (como na versão anterior)
    if (!filterStatusElement || !filterPriorityElement || !sortTasksElement) {
        console.error("main.js: ERRO INTERNO EM applyFiltersAndSort - Um ou mais elementos de filtro/ordenação são NULOS ou UNDEFINED aqui.");
        if(typeof showLoading === 'function' && typeof loadingIndicator !== 'undefined' && loadingIndicator.style.display !== 'none') {
             // Tenta chamar showLoading do ui.js se disponível e importado, para fechar o "Autenticando..."
             // import { showLoading } from './ui.js'; // Precisaria estar no topo
             // showLoading(false); 
        }
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
        if (typeof showMessage === 'function') showMessage("Erro no formulário. Tente recarregar a página.", "error");
        return;
    }
    const description = taskInput.value.trim();
    const priority = taskPriorityInput.value;
    const dueDate = taskDueDateInput.value;

    if (!description) {
        if (typeof showMessage === 'function') showMessage("A descrição da tarefa não pode estar vazia.", "error");
        return;
    }
    
    const success = await createTaskInFirestore(description, priority, dueDate);
    if (success) {
        taskInput.value = '';
        if(taskDueDateInput) taskDueDateInput.value = ''; 
        if(taskPriorityInput) taskPriorityInput.value = 'media'; 
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
    console.warn("Elementos do modal de SUBTAREFAS (botão de fechar ou o próprio modal) não encontrados para configurar o listener em main.js.");
}

// Listeners para o Modal de Relatórios (NOVOS)
if (openReportsModalButton) {
    openReportsModalButton.onclick = () => {
        if (typeof displayReport === 'function') {
            displayReport(); // displayReport também mostrará o modal
        } else {
            console.error("Função displayReport não está definida/importada para abrir modal de relatórios.");
        }
    };
} else {
    console.warn("Botão para abrir modal de relatórios (openReportsModalButton) não encontrado.");
}

if (closeReportsModalButton && reportsModalElement) {
    closeReportsModalButton.onclick = () => {
        reportsModalElement.classList.add('hidden');
    };
} else {
    console.warn("Botão para fechar modal de relatórios (closeReportsModalButton) ou o próprio modal (reportsModalElement) não encontrado.");
}

if (refreshReportsButton) {
    refreshReportsButton.onclick = () => {
        if (typeof displayReport === 'function') {
            displayReport(); // Re-calcula e exibe os dados do relatório
        } else {
            console.error("Função displayReport não está definida/importada para atualizar relatórios.");
        }
    };
} else {
    console.warn("Botão para atualizar relatórios (refreshReportsButton) não encontrado.");
}

// --- Inicialização da Aplicação ---
initFirebase(applyFiltersAndSort);