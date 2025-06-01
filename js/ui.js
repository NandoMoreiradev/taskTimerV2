import { formatTime, toggleTimer, resetTimer, getTaskTimerState, hasTaskTimer, initializeTaskTimer } from './timer.js';
import { toggleCompleteTask, deleteTask } from './firebaseService.js';
import { handleBreakdownTask } from './geminiService.js';

// Elementos DOM principais da UI (exceto aqueles específicos de modais ou formulários gerenciados em outros lugares)
const taskListElement = document.getElementById('taskList');
const taskItemTemplate = document.getElementById('taskItemTemplate');
const userInfoElement = document.getElementById('userInfo');
const messageBox = document.getElementById('messageBox');
const loadingIndicator = document.getElementById('loadingIndicator');

export function showLoading(show, message = "Aguarde...") {
    if (loadingIndicator) {
        loadingIndicator.querySelector('span').textContent = message;
        loadingIndicator.style.display = show ? 'flex' : 'none';
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
    }
}

export function updateUserInfoText(text) {
    if (userInfoElement) {
        userInfoElement.textContent = text;
    }
}

export function renderTask(task) {
    if (!task || !task.id || !taskListElement || !taskItemTemplate) {
        console.error("Tentativa de renderizar tarefa inválida ou elementos DOM ausentes:", task);
        return;
    }
    const taskElement = taskItemTemplate.content.cloneNode(true).firstElementChild;
    taskElement.dataset.id = task.id;

    const descriptionElement = taskElement.querySelector('.task-description');
    const createdAtElement = taskElement.querySelector('.task-created-at');
    const timerDisplay = taskElement.querySelector('.timer-display');
    const toggleTimerButton = taskElement.querySelector('.task-timer-toggle');
    const resetTimerButton = taskElement.querySelector('.task-timer-reset');
    const completeButton = taskElement.querySelector('.task-complete');
    const deleteButton = taskElement.querySelector('.task-delete');
    const breakdownButton = taskElement.querySelector('.task-breakdown');

    if (descriptionElement) descriptionElement.textContent = task.description;
    
    if (createdAtElement && task.createdAt) {
        try {
            const date = task.createdAt.toDate ? task.createdAt.toDate() : new Date(task.createdAt);
            createdAtElement.textContent = `Criada em: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
        } catch (e) {
            createdAtElement.textContent = `Criada em: (data inválida)`;
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
            // A lógica de startLocalTimer agora é chamada dentro de toggleTimer em timer.js
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
        breakdownButton.onclick = () => handleBreakdownTask(task.id, task.description);
    }

    if (completeButton) {
        if (task.isCompleted) {
            taskElement.classList.add('task-completed');
            completeButton.innerHTML = '<i class="fas fa-undo mr-1"></i> Reabrir';
            completeButton.classList.replace('btn-success','btn-warning');
            // A lógica de pausar timer ao concluir é tratada em toggleCompleteTask/firebaseService
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
    if (taskListElement && taskListElement.innerHTML === '') {
        taskListElement.innerHTML = '<p class="text-slate-400 text-center py-4">Nenhuma tarefa ainda. Adicione uma!</p>';
    }
}

export function removeNoTasksMessage() {
    if (taskListElement) {
        const noTaskMsg = taskListElement.querySelector('p.text-slate-400');
        if (noTaskMsg) noTaskMsg.remove();
    }
}

export function getTaskListElement() {
    return taskListElement;
}