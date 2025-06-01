import { createTaskInFirestore } from './firebaseService.js';
import { showMessage, showLoading } from './ui.js'; 

// Elementos DOM do Modal de Subtarefas
const subtaskModal = document.getElementById('subtaskModal');
const closeSubtaskModalButton = document.getElementById('closeSubtaskModal');
const originalTaskNameSpan = document.getElementById('originalTaskName');
const suggestedSubtasksListElement = document.getElementById('suggestedSubtasksList');
const subtaskLoadingIndicator = document.getElementById('subtaskLoadingIndicator'); 
const subtaskErrorState = document.getElementById('subtaskErrorState');
const subtaskErrorMessage = document.getElementById('subtaskErrorMessage');

export async function getSubtaskSuggestionsFromAPI(taskDescription) {
    if (subtaskLoadingIndicator) subtaskLoadingIndicator.classList.remove('hidden');
    if (subtaskErrorState) subtaskErrorState.classList.add('hidden');
    if (suggestedSubtasksListElement) suggestedSubtasksListElement.innerHTML = '';

    const localApiUrl = '/api/generateSubtasks';

    try {
        const response = await fetch(localApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskDescription: taskDescription })
        });
        const result = await response.json();
        if (!response.ok) {
            const errorMessageText = result.message || `Erro ao chamar a API local (${response.status})`;
            console.error("API Local Error Response:", result);
            throw new Error(errorMessageText);
        }
        if (result.subtasks) {
            return result.subtasks;
        } else {
            console.error("Resposta inesperada da API Local:", result);
            throw new Error("Não foi possível obter sugestões de subtarefas ou a resposta está vazia.");
        }
    } catch (error) {
        console.error("Erro ao chamar API Local ou processar resposta:", error);
        if (subtaskErrorMessage) subtaskErrorMessage.textContent = error.message || "Ocorreu um erro ao gerar sugestões.";
        if (subtaskErrorState) subtaskErrorState.classList.remove('hidden');
        return null;
    } finally {
        if (subtaskLoadingIndicator) subtaskLoadingIndicator.classList.add('hidden');
    }
}

export function displaySubtaskSuggestionsModal(originalTaskDesc, suggestions) {
    if (!subtaskModal || !originalTaskNameSpan || !suggestedSubtasksListElement) return;

    originalTaskNameSpan.textContent = originalTaskDesc.substring(0, 50) + (originalTaskDesc.length > 50 ? "..." : "");
    suggestedSubtasksListElement.innerHTML = ''; 

    if (!suggestions || suggestions.length === 0) {
        if (!subtaskErrorState || subtaskErrorState.classList.contains('hidden')) { 
             suggestedSubtasksListElement.innerHTML = '<p class="text-slate-400 text-center">Nenhuma sugestão de subtarefa foi gerada.</p>';
        }
    } else {
        suggestions.forEach(suggestionText => {
            const div = document.createElement('div');
            div.className = 'flex justify-between items-center bg-slate-700 p-3 rounded-md hover:bg-slate-600 transition-colors';
            
            const span = document.createElement('span');
            span.className = 'text-slate-100 text-sm flex-grow mr-3';
            span.textContent = suggestionText;
            
            const addButton = document.createElement('button');
            addButton.className = 'btn btn-primary text-white py-1 px-3 rounded-md text-xs add-subtask-btn';
            addButton.innerHTML = '<i class="fas fa-plus mr-1"></i> Adicionar';
            addButton.onclick = async () => {
                addButton.disabled = true;
                addButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Adicionando...';
                const success = await createTaskInFirestore(suggestionText); // Chama a função do firebaseService
                if (success) {
                    showMessage(`Subtarefa "${suggestionText.substring(0,20).trimEnd()}..." adicionada!`, 'success');
                    div.remove();
                    if (suggestedSubtasksListElement.children.length === 0) {
                        suggestedSubtasksListElement.innerHTML = '<p class="text-slate-400 text-center">Todas as sugestões foram adicionadas!</p>';
                    }
                } else {
                    addButton.innerHTML = '<i class="fas fa-plus mr-1"></i> Adicionar';
                }
                addButton.disabled = false;
            };
            
            div.appendChild(span);
            div.appendChild(addButton);
            suggestedSubtasksListElement.appendChild(div);
        });
    }
    subtaskModal.classList.remove('hidden');
}

export async function handleBreakdownTask(taskId, taskDescription) { 
    if (!taskDescription) {
        showMessage("A tarefa não tem descrição para ser quebrada.", "error");
        return;
    }
    if (!subtaskModal || !originalTaskNameSpan || !suggestedSubtasksListElement || !subtaskErrorState) return;

    subtaskModal.classList.remove('hidden');
    originalTaskNameSpan.textContent = taskDescription.substring(0, 50) + (taskDescription.length > 50 ? "..." : "");
    suggestedSubtasksListElement.innerHTML = '';
    subtaskErrorState.classList.add('hidden');
    // O loading interno do modal é ativado/desativado por getSubtaskSuggestionsFromAPI

    const suggestions = await getSubtaskSuggestionsFromAPI(taskDescription);
    
   
    if (suggestions) {
        displaySubtaskSuggestionsModal(taskDescription, suggestions);
    } else if (!subtaskErrorState.classList.contains('hidden')) {
        // Erro já foi exibido, não faz nada
    } else {
        // Caso raro: getSubtaskSuggestionsFromAPI retornou null sem mostrar erro (não deveria acontecer com a lógica atual)
        suggestedSubtasksListElement.innerHTML = '<p class="text-slate-400 text-center">Não foi possível gerar sugestões no momento.</p>';
    }
}

export function getCloseSubtaskModalButton() {
    return closeSubtaskModalButton;
}

export function getSubtaskModal() {
    return subtaskModal;
}

export function getSubtaskLoadingIndicator() {
    return subtaskLoadingIndicator; // Retorna o elemento do loading interno do modal
}

export function getSubtaskErrorStateElement() {
    return subtaskErrorState;
}

export function getSuggestedSubtasksListElement() {
    return suggestedSubtasksListElement;
}