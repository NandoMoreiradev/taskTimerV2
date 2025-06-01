// js/ui.js

import { formatTime, toggleTimer, resetTimer, getTaskTimerState, initializeTaskTimer, hasTaskTimer } from './timer.js';
import { toggleCompleteTask, deleteTask, updateTask } from './firebaseService.js';
import { handleBreakdownTask } from './geminiService.js';

const taskListElement = document.getElementById('taskList');
const taskItemTemplate = document.getElementById('taskItemTemplate');
const userInfoElement = document.getElementById('userInfo');
const messageBox = document.getElementById('messageBox');
const loadingIndicator = document.getElementById('loadingIndicator');

console.log("ui.js - Ao carregar o módulo - taskListElement:", taskListElement);
console.log("ui.js - Ao carregar o módulo - taskItemTemplate:", taskItemTemplate);

export function showLoading(show, message = "Aguarde...") {
    if (loadingIndicator) {
        loadingIndicator.querySelector('span').textContent = message;
        loadingIndicator.style.display = show ? 'flex' : 'none';
    } else {
        console.warn("Elemento loadingIndicator não encontrado no DOM.");
    }
}

export function showMessage(message, type = 'success', duration = 3000) {
    if (messageBox) {
        messageBox.textContent = message;
        messageBox.className = `fixed bottom-5 right-5 p-3 rounded-md shadow-lg text-white ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`;
        messageBox.classList.add('show');
        setTimeout(() => {
            messageBox.classList.remove('show');
        }, duration);
    } else {
        console.warn("Elemento messageBox não encontrado no DOM.");
    }
}

export function updateUserInfoText(text) {
    if (userInfoElement) {
        userInfoElement.textContent = text;
    } else {
        console.warn("Elemento userInfoElement não encontrado no DOM.");
    }
}

export function renderTask(task) {
    if (!task || !task.id) {
        console.error("ui.js: Tentativa de renderizar tarefa inválida (sem task ou task.id):", task);
        return;
    }
    if (!taskListElement || !taskItemTemplate) {
        console.error("ui.js: taskListElement ou taskItemTemplate não encontrado. Não é possível renderizar tarefas.");
        return; 
    }

    const taskElement = taskItemTemplate.content.cloneNode(true).firstElementChild;
    taskElement.dataset.id = task.id;

    const descriptionElement = taskElement.querySelector('.task-description');
    const descriptionEditInput = taskElement.querySelector('.task-description-edit');
    const longDescriptionEditInput = taskElement.querySelector('.task-long-description-edit'); // NOVO
    const createdAtElement = taskElement.querySelector('.task-created-at');
    const taskPriorityElement = taskElement.querySelector('.task-priority');
    const taskDueDateElement = taskElement.querySelector('.task-due-date');
    const longDescriptionContainer = taskElement.querySelector('.task-long-description-container'); // NOVO
    const toggleLongDescriptionButton = taskElement.querySelector('.toggle-long-description'); // NOVO
    const longDescriptionDisplay = taskElement.querySelector('.task-long-description-display'); // NOVO

    const timerDisplay = taskElement.querySelector('.timer-display');
    const toggleTimerButton = taskElement.querySelector('.task-timer-toggle');
    const resetTimerButton = taskElement.querySelector('.task-timer-reset');
    const completeButton = taskElement.querySelector('.task-complete');
    const deleteButton = taskElement.querySelector('.task-delete');
    const breakdownButton = taskElement.querySelector('.task-breakdown');
    const editButton = taskElement.querySelector('.task-edit');
    const saveEditButton = taskElement.querySelector('.task-save-edit');
    const cancelEditButton = taskElement.querySelector('.task-cancel-edit');

    console.log(`ui.js: Tentando encontrar o botão ".task-breakdown" para a tarefa "${task.description}". Encontrado:`, breakdownButton);
    
    if (descriptionElement) descriptionElement.textContent = task.description;
    if (descriptionEditInput) descriptionEditInput.value = task.description;
    if (longDescriptionEditInput) longDescriptionEditInput.value = task.longDescription || "";
    
    if (createdAtElement && task.createdAt) {
        try {
            const date = task.createdAt.toDate ? task.createdAt.toDate() : new Date(task.createdAt);
            createdAtElement.textContent = `Criada em: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
        } catch (e) {
            createdAtElement.textContent = `Criada em: (data inválida)`;
            console.warn("ui.js: Erro ao formatar data de criação:", e);
        }
    }

    if (taskPriorityElement) {
        let priorityText = 'Média';
        if (task.priority === 'alta') priorityText = 'Alta';
        else if (task.priority === 'baixa') priorityText = 'Baixa';
        taskPriorityElement.textContent = `Prioridade: ${priorityText}`;
        taskPriorityElement.className = 'task-priority text-xs'; 
        if (task.priority === 'alta') taskPriorityElement.classList.add('text-red-400', 'font-semibold');
        else if (task.priority === 'baixa') taskPriorityElement.classList.add('text-green-400');
        else taskPriorityElement.classList.add('text-slate-400');
    }

    if (taskDueDateElement) {
        if (task.dueDate) {
            try {
                const dueDate = new Date(task.dueDate + 'T00:00:00');
                taskDueDateElement.textContent = `Vencimento: ${dueDate.toLocaleDateString()}`;
                const today = new Date(); today.setHours(0,0,0,0);
                if (dueDate < today && !task.isCompleted) {
                    taskDueDateElement.classList.add('text-orange-400', 'font-semibold');
                } else {
                    taskDueDateElement.classList.remove('text-orange-400', 'font-semibold');
                }
            } catch(e) {
                taskDueDateElement.textContent = 'Vencimento: (data inválida)';
                console.warn("ui.js: Erro ao formatar data de vencimento:", e);
            }
        } else {
            taskDueDateElement.textContent = 'Sem data de vencimento';
            taskDueDateElement.classList.remove('text-orange-400', 'font-semibold');
        }
    }

    // Lógica para exibir/ocultar descrição longa (NOVO)
    if (longDescriptionContainer && toggleLongDescriptionButton && longDescriptionDisplay) {
        if (task.longDescription && task.longDescription.trim() !== "") {
            longDescriptionContainer.classList.remove('hidden');
            toggleLongDescriptionButton.classList.remove('hidden');
            longDescriptionDisplay.textContent = task.longDescription;
            
            let isLongDescriptionVisible = false; // Estado inicial por tarefa
            longDescriptionDisplay.classList.add('hidden'); // Começa oculto
            toggleLongDescriptionButton.innerHTML = 'Ver Detalhes <i class="fas fa-chevron-down fa-xs ml-1"></i>';

            toggleLongDescriptionButton.onclick = () => {
                isLongDescriptionVisible = !isLongDescriptionVisible;
                if (isLongDescriptionVisible) {
                    longDescriptionDisplay.classList.remove('hidden');
                    toggleLongDescriptionButton.innerHTML = 'Ocultar Detalhes <i class="fas fa-chevron-up fa-xs ml-1"></i>';
                } else {
                    longDescriptionDisplay.classList.add('hidden');
                    toggleLongDescriptionButton.innerHTML = 'Ver Detalhes <i class="fas fa-chevron-down fa-xs ml-1"></i>';
                }
            };
        } else {
            longDescriptionContainer.classList.add('hidden');
            toggleLongDescriptionButton.classList.add('hidden');
            longDescriptionDisplay.classList.add('hidden');
        }
    }


    if (!hasTaskTimer(task.id)) {
        initializeTaskTimer(task.id, task.timeSpent || 0, task.isRunning || false);
    }
    const timerState = getTaskTimerState(task.id);
    if (timerDisplay) timerDisplay.textContent = formatTime(timerState.timeSpent);

    if (toggleTimerButton) {
        if (timerState.isRunning) {
            toggleTimerButton.innerHTML = '<i class="fas fa-pause mr-1"></i> Pausar';
            toggleTimerButton.classList.replace('btn-primary', 'btn-secondary');
        } else {
            toggleTimerButton.innerHTML = '<i class="fas fa-play mr-1"></i> Iniciar';
            toggleTimerButton.classList.replace('btn-secondary', 'btn-primary');
        }
        toggleTimerButton.onclick = () => toggleTimer(task.id, taskElement);
    }

    if (resetTimerButton) {
        resetTimerButton.onclick = () => resetTimer(task.id, taskElement);
    }
    
    if (breakdownButton) {
        console.log(`ui.js: Configurando listener para "Quebrar Tarefa", ID da tarefa: ${task.id}`);
        breakdownButton.onclick = () => {
            console.log(`ui.js: Botão "Quebrar Tarefa" CLICADO para tarefa ID: ${task.id}, Descrição: ${task.description}`);
            handleBreakdownTask(task.id, task.description);
        };
    } else {
        console.error(`ui.js: Botão ".task-breakdown" NÃO FOI ENCONTRADO no template para a tarefa ID: ${task.id}`);
    }

    if (completeButton) {
        if (task.isCompleted) {
            taskElement.classList.add('task-completed');
            completeButton.innerHTML = '<i class="fas fa-undo mr-1"></i> Reabrir';
            completeButton.classList.replace('btn-success','btn-warning');
        } else {
            taskElement.classList.remove('task-completed');
            completeButton.innerHTML = '<i class="fas fa-check mr-1"></i> Concluir';
            completeButton.classList.replace('btn-warning','btn-success');
        }
        completeButton.onclick = () => toggleCompleteTask(task.id, !task.isCompleted);
    }

    if (deleteButton) {
        deleteButton.onclick = () => deleteTask(task.id);
    }

    const switchToViewMode = () => {
        if(descriptionElement) descriptionElement.classList.remove('hidden');
        if(descriptionEditInput) descriptionEditInput.classList.add('hidden');
        if(longDescriptionEditInput) longDescriptionEditInput.classList.add('hidden'); // Esconde textarea
        if(editButton) editButton.classList.remove('hidden');
        if(saveEditButton) saveEditButton.classList.add('hidden');
        if(cancelEditButton) cancelEditButton.classList.add('hidden');
        
        // Reavalia a visibilidade do container de descrição longa
        if (longDescriptionContainer && toggleLongDescriptionButton && longDescriptionDisplay) {
            if (task.longDescription && task.longDescription.trim() !== "") {
                longDescriptionContainer.classList.remove('hidden');
                toggleLongDescriptionButton.classList.remove('hidden');
                longDescriptionDisplay.textContent = task.longDescription;
                // Resetar o botão toggle para estado inicial (oculto) para forçar o usuário a clicar de novo se quiser ver
                longDescriptionDisplay.classList.add('hidden'); 
                toggleLongDescriptionButton.innerHTML = 'Ver Detalhes <i class="fas fa-chevron-down fa-xs ml-1"></i>';
            } else {
                longDescriptionContainer.classList.add('hidden');
            }
        }
    };

    const switchToEditMode = () => {
        if(descriptionElement) descriptionElement.classList.add('hidden');
        if(longDescriptionContainer) longDescriptionContainer.classList.add('hidden'); // Esconde a visualização da descrição longa

        if(descriptionEditInput) {
            descriptionEditInput.value = task.description;
            descriptionEditInput.classList.remove('hidden');
            descriptionEditInput.focus(); 
        }
        if(longDescriptionEditInput) { 
            longDescriptionEditInput.value = task.longDescription || "";
            longDescriptionEditInput.classList.remove('hidden');
        }
        if(editButton) editButton.classList.add('hidden');
        if(saveEditButton) saveEditButton.classList.remove('hidden');
        if(cancelEditButton) cancelEditButton.classList.remove('hidden');
    };

    if (editButton) { editButton.onclick = switchToEditMode; }
    if (saveEditButton) {
        saveEditButton.onclick = async () => {
            if (!descriptionEditInput || !longDescriptionEditInput) return;
            const newDescription = descriptionEditInput.value.trim();
            const newLongDescription = longDescriptionEditInput.value.trim(); 

            const dataToUpdate = {};
            let hasChanges = false;

            // Verifica se a descrição principal mudou
            if (newDescription !== task.description) {
                dataToUpdate.description = newDescription; // Permite string vazia para apagar
                hasChanges = true;
            }

            // Verifica se a descrição longa mudou
            if (newLongDescription !== (task.longDescription || "")) {
                dataToUpdate.longDescription = newLongDescription;
                hasChanges = true;
            }
            
            if (hasChanges) {
                // Se não houve mudança na descrição principal, mas houve na longa,
                // precisamos garantir que a descrição principal original seja mantida.
                if (!dataToUpdate.hasOwnProperty('description') && dataToUpdate.hasOwnProperty('longDescription')) {
                    dataToUpdate.description = task.description;
                }
                await updateTask(task.id, dataToUpdate);
            }
            // O onSnapshot irá re-renderizar. Apenas voltamos para o modo de visualização aqui.
            // No entanto, o onSnapshot pode não re-renderizar task.longDescription no task object imediatamente
            // se não for parte da query ou se o update for muito rápido.
            // Para garantir que a UI reflita a mudança imediatamente (otimista), poderíamos atualizar task.longDescription localmente
            // Mas vamos confiar no onSnapshot por enquanto e ajustar se necessário.
            switchToViewMode(); 
        };
    }
    if (cancelEditButton) { cancelEditButton.onclick = switchToViewMode; }
    
    const existingElement = taskListElement.querySelector(`[data-id="${task.id}"]`);
    if (existingElement) {
        taskListElement.replaceChild(taskElement, existingElement);
    } else {
        taskListElement.appendChild(taskElement);
    }
}

export function clearTaskList() {
    if(taskListElement) taskListElement.innerHTML = '';
}

export function displayNoTasksMessage() {
    if (taskListElement && taskListElement.children.length === 0) {
        taskListElement.innerHTML = '<p class="text-slate-400 text-center py-4">Nenhuma tarefa ainda. Adicione uma!</p>';
    }
}

export function removeNoTasksMessage() {
    if (taskListElement) {
        const noTaskMsg = taskListElement.querySelector('p.text-slate-400.text-center.py-4');
        if (noTaskMsg && noTaskMsg.parentElement === taskListElement) noTaskMsg.remove();
    }
}

export function getTaskListElement() {
    return taskListElement;
}