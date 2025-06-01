import { updateTimerStateInFirestore } from './firebaseService.js';
import { showMessage } from './ui.js';

const taskTimers = new Map(); // taskId -> { intervalId, timeSpent, isRunning }

export function formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function startLocalTimerInterval(taskId, taskElement) {
    const timerState = taskTimers.get(taskId);
    if (timerState.intervalId) clearInterval(timerState.intervalId); 

    timerState.isRunning = true;
    timerState.intervalId = setInterval(async () => {
        timerState.timeSpent++;
        const timerDisplay = taskElement.querySelector('.timer-display');
        if (timerDisplay) timerDisplay.textContent = formatTime(timerState.timeSpent);
        
        // Atualiza no Firestore a cada 10 segundos para persistência
        if (timerState.timeSpent % 10 === 0) { 
            updateTimerStateInFirestore(taskId, timerState.timeSpent, true);
        }
    }, 1000);
}

export function pauseLocalTimer(taskId) {
    const timerState = taskTimers.get(taskId);
    if (timerState && timerState.intervalId) {
        clearInterval(timerState.intervalId);
        timerState.intervalId = null;
    }
    if (timerState) {
        timerState.isRunning = false;
    }
}

export async function toggleTimer(taskId, taskElement) {
    const timerState = taskTimers.get(taskId);
    if (!timerState) {
        console.error("Estado do timer não encontrado para taskId:", taskId);
        return;
    }

    const taskCard = taskElement.closest('.task-card'); // Encontra o card da tarefa
     if (taskCard && taskCard.classList.contains('task-completed')) {
        showMessage("Não é possível iniciar o timer de uma tarefa concluída.", "error");
        return;
    }

    const toggleButton = taskElement.querySelector('.task-timer-toggle');

    if (timerState.isRunning) { 
        pauseLocalTimer(taskId);
        if (toggleButton) {
            toggleButton.innerHTML = '<i class="fas fa-play mr-1"></i> Iniciar';
            toggleButton.classList.replace('btn-secondary','btn-primary');
        }
        await updateTimerStateInFirestore(taskId, timerState.timeSpent, false);
    } else { 
        startLocalTimerInterval(taskId, taskElement);
        if (toggleButton) {
            toggleButton.innerHTML = '<i class="fas fa-pause mr-1"></i> Pausar';
            toggleButton.classList.replace('btn-primary','btn-secondary');
        }
        await updateTimerStateInFirestore(taskId, timerState.timeSpent, true);
    }
}

export async function resetTimer(taskId, taskElement) {
    pauseLocalTimer(taskId); 
    const timerState = taskTimers.get(taskId);
    if (!timerState) return;

    timerState.timeSpent = 0;
    timerState.isRunning = false; 

    const timerDisplay = taskElement.querySelector('.timer-display');
    if (timerDisplay) timerDisplay.textContent = formatTime(0);
    
    const toggleButton = taskElement.querySelector('.task-timer-toggle');
    if (toggleButton) {
        toggleButton.innerHTML = '<i class="fas fa-play mr-1"></i> Iniciar';
        toggleButton.classList.replace('btn-secondary','btn-primary');
    }
    
    await updateTimerStateInFirestore(taskId, 0, false);
    showMessage("Timer resetado.", "success");
}

export function initializeTaskTimer(taskId, initialTime = 0, initiallyRunning = false) {
    if (!taskTimers.has(taskId)) {
        taskTimers.set(taskId, {
            intervalId: null,
            timeSpent: initialTime,
            isRunning: initiallyRunning,
        });
    }
    // Se estiver rodando e não tiver intervalId (ex: após recarregar a página)
    // A renderTask chamará toggleTimer que reiniciará o intervalo se necessário
}

export function getTaskTimerState(taskId) {
    if (!taskTimers.has(taskId)) {
        initializeTaskTimer(taskId); // Garante que existe um estado
    }
    return taskTimers.get(taskId);
}

export function hasTaskTimer(taskId) {
    return taskTimers.has(taskId);
}

export function removeTaskTimer(taskId) {
    if (taskTimers.has(taskId)) {
        pauseLocalTimer(taskId);
        taskTimers.delete(taskId);
    }
}