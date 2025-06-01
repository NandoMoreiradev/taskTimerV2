// js/geminiService.js

import { createTaskInFirestore } from './firebaseService.js';
import { showMessage } from './ui.js';

// --- Seletores de Elementos DOM do Modal de Subtarefas ---
const subtaskModal = document.getElementById('subtaskModal');
const closeSubtaskModalButton = document.getElementById('closeSubtaskModal');
const originalTaskNameSpan = document.getElementById('originalTaskName');
const suggestedSubtasksListElement = document.getElementById('suggestedSubtasksList');
const subtaskLoadingIndicator = document.getElementById('subtaskLoadingIndicator');
const subtaskErrorState = document.getElementById('subtaskErrorState');
const subtaskErrorMessage = document.getElementById('subtaskErrorMessage');

// --- Logs para verificar elementos do modal de subtarefas ---
console.log("geminiService.js - Ao carregar - subtaskModal:", subtaskModal);
console.log("geminiService.js - Ao carregar - closeSubtaskModalButton:", closeSubtaskModalButton);
console.log("geminiService.js - Ao carregar - originalTaskNameSpan:", originalTaskNameSpan);
console.log("geminiService.js - Ao carregar - suggestedSubtasksListElement:", suggestedSubtasksListElement);
console.log("geminiService.js - Ao carregar - subtaskLoadingIndicator:", subtaskLoadingIndicator);
console.log("geminiService.js - Ao carregar - subtaskErrorState:", subtaskErrorState);
console.log("geminiService.js - Ao carregar - subtaskErrorMessage:", subtaskErrorMessage);


// --- Funções do Modal de Subtarefas ---
export async function getSubtaskSuggestionsFromAPI(taskDescription) {
    console.log(`geminiService.js: getSubtaskSuggestionsFromAPI CHAMADA. Descrição: ${taskDescription}`); // LOG RASTREIO 4 (do debug anterior)
    
    if (!subtaskLoadingIndicator || !subtaskErrorState || !suggestedSubtasksListElement || !subtaskErrorMessage) {
        console.error("geminiService.js: Elementos essenciais do modal de SUBTAREFAS não encontrados em getSubtaskSuggestionsFromAPI.");
        return null;
    }

    subtaskLoadingIndicator.classList.remove('hidden');
    subtaskErrorState.classList.add('hidden');
    suggestedSubtasksListElement.innerHTML = ''; 

    const localApiUrl = '/api/generateSubtasks'; // Este é para QUEBRAR TAREFAS

    try {
        const response = await fetch(localApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskDescription: taskDescription })
        });
        const result = await response.json(); 
        if (!response.ok) {
            const errorMessageText = result.message || `Erro ao chamar a API local de subtarefas (${response.status})`;
            console.error("geminiService.js - API Local Error Response (subtasks):", result);
            throw new Error(errorMessageText);
        }
        if (result.subtasks) {
            return result.subtasks;
        } else {
            console.error("geminiService.js - Resposta inesperada da API Local (subtasks):", result);
            throw new Error("Resposta da API de subtarefas não continha as subtarefas.");
        }
    } catch (error) {
        console.error("geminiService.js - Erro em getSubtaskSuggestionsFromAPI:", error);
        if(subtaskErrorMessage) subtaskErrorMessage.textContent = error.message || "Ocorreu um erro ao gerar sugestões de subtarefas.";
        if(subtaskErrorState) subtaskErrorState.classList.remove('hidden');
        return null;
    } finally {
        if(subtaskLoadingIndicator) subtaskLoadingIndicator.classList.add('hidden');
    }
}

export function displaySubtaskSuggestionsModal(originalTaskDesc, suggestions) {
    console.log("geminiService.js: displaySubtaskSuggestionsModal CHAMADA.");
    
    if (!subtaskModal || !originalTaskNameSpan || !suggestedSubtasksListElement || !subtaskErrorState) {
        console.error("geminiService.js: Elementos essenciais do modal de SUBTAREFAS não encontrados para displaySubtaskSuggestionsModal.");
        showMessage("Erro ao exibir o modal de sugestões de subtarefas.", "error");
        return;
    }

    originalTaskNameSpan.textContent = originalTaskDesc.substring(0, 50) + (originalTaskDesc.length > 50 ? "..." : "");
    suggestedSubtasksListElement.innerHTML = ''; 

    if (!suggestions || suggestions.length === 0) {
        if (subtaskErrorState.classList.contains('hidden')) { 
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
                const success = await createTaskInFirestore(suggestionText); 
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
    console.log(`geminiService.js: handleBreakdownTask CHAMADA. Descrição: ${taskDescription}`); // LOG RASTREIO 3
    
    if (!subtaskModal || !originalTaskNameSpan || !suggestedSubtasksListElement || !subtaskErrorState) {
        console.error("geminiService.js: Elementos do modal de SUBTAREFAS não encontrados no início de handleBreakdownTask. Abortando.");
        showMessage("Erro ao preparar o modal de quebra de tarefas.", "error");
        return;
    }

    subtaskModal.classList.remove('hidden');
    originalTaskNameSpan.textContent = taskDescription.substring(0, 50) + (taskDescription.length > 50 ? "..." : "");
    suggestedSubtasksListElement.innerHTML = ''; 
    subtaskErrorState.classList.add('hidden'); 

    const suggestions = await getSubtaskSuggestionsFromAPI(taskDescription);
    
    if (suggestions) { 
        displaySubtaskSuggestionsModal(taskDescription, suggestions);
    } else {
        if (subtaskErrorState.classList.contains('hidden') && (!suggestions || suggestions.length === 0)) {
             displaySubtaskSuggestionsModal(taskDescription, []); 
        }
    }
}

// --- Funções Getter para Elementos do Modal de Subtarefas ---
export function getCloseSubtaskModalButton() { return closeSubtaskModalButton; }
export function getSubtaskModal() { return subtaskModal; }
export function getSubtaskLoadingIndicator() { return subtaskLoadingIndicator; }
export function getSubtaskErrorStateElement() { return subtaskErrorState; }
export function getSuggestedSubtasksListElement() { return suggestedSubtasksListElement; }