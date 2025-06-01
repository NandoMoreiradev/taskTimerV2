// js/timer.js

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
    if (!timerState) {
        console.error(`timer.js: Estado do timer não encontrado para iniciar o intervalo (ID: ${taskId})`);
        return;
    }
    if (timerState.intervalId) clearInterval(timerState.intervalId); 

    timerState.isRunning = true;
    timerState.intervalId = setInterval(async () => {
        timerState.timeSpent++;
        const timerDisplay = taskElement.querySelector('.timer-display');
        if (timerDisplay) {
            timerDisplay.textContent = formatTime(timerState.timeSpent);
        }
        
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
        console.error(`timer.js: Estado do timer não encontrado para toggle (ID: ${taskId})`);
        // Tenta inicializar se por algum motivo não existia, embora renderTask deva cuidar disso.
        initializeTaskTimer(taskId, 0, false); 
        // Pode ser necessário obter o estado novamente ou retornar, dependendo da robustez desejada.
        // Por ora, vamos assumir que renderTask garante a inicialização.
        return;
    }

    const taskCard = taskElement.closest('.task-card');
    if (taskCard && taskCard.classList.contains('task-completed')) {
        if (typeof showMessage === 'function') showMessage("Não é possível iniciar o timer de uma tarefa concluída.", "error");
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
    if (!timerState) {
        console.error(`timer.js: Estado do timer não encontrado para reset (ID: ${taskId})`);
        return;
    }

    timerState.timeSpent = 0;
    timerState.isRunning = false; 

    const timerDisplay = taskElement.querySelector('.timer-display');
    if (timerDisplay) {
        timerDisplay.textContent = formatTime(0);
    }
    
    const toggleButton = taskElement.querySelector('.task-timer-toggle');
    if (toggleButton) {
        toggleButton.innerHTML = '<i class="fas fa-play mr-1"></i> Iniciar';
        toggleButton.classList.replace('btn-secondary','btn-primary');
    }
    
    await updateTimerStateInFirestore(taskId, 0, false);
    if (typeof showMessage === 'function') showMessage("Timer resetado.", "success");
}

export function initializeTaskTimer(taskId, initialTime = 0, initiallyRunning = false) {
    if (!taskTimers.has(taskId)) {
        taskTimers.set(taskId, {
            intervalId: null,
            timeSpent: initialTime,
            isRunning: initiallyRunning,
        });
         console.log(`timer.js: Timer inicializado para tarefa ${taskId} - Tempo: ${initialTime}, Rodando: ${initiallyRunning}`);
    } else {
        // Se já existe, atualiza com os valores do Firestore, especialmente se isRunning for true
        const timerState = taskTimers.get(taskId);
        timerState.timeSpent = initialTime;
        // Não mudamos isRunning aqui diretamente se já existe, pois toggleTimer e pauseLocalTimer gerenciam isso.
        // A menos que initiallyRunning seja true e o timer não esteja rodando (ex: após refresh).
        // A lógica em renderTask (que chama getTaskTimerState) e toggleTimer cuidará de iniciar o intervalo se necessário.
    }
}

export function getTaskTimerState(taskId) {
    if (!taskTimers.has(taskId)) {
        // Isso pode acontecer se uma tarefa for renderizada antes do Firestore carregar todos os dados
        // ou se houver uma nova tarefa. initializeTaskTimer deve ser chamado antes disso.
        // Para segurança, inicializamos aqui se não existir, mas o ideal é que
        // initializeTaskTimer seja chamado em loadTasks ou ao criar uma nova tarefa.
        console.warn(`timer.js: getTaskTimerState chamado para ID ${taskId} sem timer inicializado. Inicializando com padrão.`);
        initializeTaskTimer(taskId); 
    }
    return taskTimers.get(taskId);
}

export function hasTaskTimer(taskId) {
    return taskTimers.has(taskId);
}

export function removeTaskTimer(taskId) {
    if (taskTimers.has(taskId)) {
        pauseLocalTimer(taskId); // Garante que o intervalo seja limpo
        taskTimers.delete(taskId);
        console.log(`timer.js: Timer removido para tarefa ${taskId}`);
    }
}