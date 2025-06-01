// js/reportsService.js
import { fetchAllUserTasks } from './firebaseService.js';
import { formatTime } from './timer.js'; // Para formatar o tempo total gasto

// DOM Elements for the reports modal (selected here for encapsulation)
const reportsModal = document.getElementById('reportsModal');
const reportsContent = document.getElementById('reportsContent');
const reportTotalTasksSpan = document.getElementById('reportTotalTasks');
const reportCompletedTasksSpan = document.getElementById('reportCompletedTasks');
const reportPendingTasksSpan = document.getElementById('reportPendingTasks');
const reportCompletionPercentageSpan = document.getElementById('reportCompletionPercentage');
const reportTotalTimeSpentSpan = document.getElementById('reportTotalTimeSpent');
// const reportCompletedTodaySpan = document.getElementById('reportCompletedToday'); // Para uma futura funcionalidade

const reportsLoadingDiv = document.getElementById('reportsLoading');
const reportsErrorDiv = document.getElementById('reportsError');

// Verifica se todos os elementos do modal foram encontrados
if (!reportsModal || !reportsContent || !reportTotalTasksSpan || !reportCompletedTasksSpan || 
    !reportPendingTasksSpan || !reportCompletionPercentageSpan || !reportTotalTimeSpentSpan ||
    !reportsLoadingDiv || !reportsErrorDiv) {
    console.error("reportsService.js: Um ou mais elementos do DOM para o modal de relatórios não foram encontrados. Verifique os IDs no index.html.");
}

async function generateReportData() {
    // Mostra o loading específico do modal de relatórios
    if (reportsLoadingDiv) reportsLoadingDiv.classList.remove('hidden');
    if (reportsErrorDiv) reportsErrorDiv.classList.add('hidden');
    if (reportsContent) reportsContent.classList.add('hidden'); // Esconde conteúdo antigo enquanto carrega

    const tasks = await fetchAllUserTasks(); // Busca todas as tarefas do usuário
    
    if (!tasks) { // fetchAllUserTasks retorna [] em caso de erro, então verificamos se é null/undefined ou se a chamada falhou
        throw new Error("Não foi possível buscar as tarefas para o relatório.");
    }

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.isCompleted).length;
    const pendingTasks = totalTasks - completedTasks;
    const completionPercentage = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : "0.0";
    
    const totalTimeSpentSeconds = tasks.reduce((sum, task) => {
        return sum + (Number(task.timeSpent) || 0); // Garante que timeSpent é um número
    }, 0);
    const totalTimeSpentFormatted = formatTime(totalTimeSpentSeconds); // Usa a função de timer.js

    // Lógica para "Tarefas Concluídas Hoje" (exemplo, pode ser ativada depois)
    /*
    const completedToday = tasks.filter(task => {
        if (!task.isCompleted || !task.completedAt) return false;
        // completedAt pode ser um objeto Timestamp do Firestore ou uma string/número se já convertido
        let completedDate;
        if (task.completedAt.toDate) { // Se for Timestamp do Firestore
            completedDate = task.completedAt.toDate();
        } else if (typeof task.completedAt === 'string' || typeof task.completedAt === 'number') {
            completedDate = new Date(task.completedAt);
        } else {
            return false; // Data inválida
        }
        
        const today = new Date();
        return completedDate.getFullYear() === today.getFullYear() &&
               completedDate.getMonth() === today.getMonth() &&
               completedDate.getDate() === today.getDate();
    }).length;
    */

    return {
        totalTasks,
        completedTasks,
        pendingTasks,
        completionPercentage,
        totalTimeSpentFormatted,
        // completedToday: completedToday || 0
    };
}

export async function displayReport() {
    if (!reportsModal) {
        console.error("reportsService.js: Elemento reportsModal não encontrado.");
        // Talvez chamar showMessage global do ui.js se importado
        return;
    }

    // Garante que os elementos de conteúdo do relatório existam antes de tentar usá-los
    if (!reportTotalTasksSpan || !reportCompletedTasksSpan || !reportPendingTasksSpan || 
        !reportCompletionPercentageSpan || !reportTotalTimeSpentSpan || 
        !reportsLoadingDiv || !reportsErrorDiv || !reportsContent) {
        console.error("reportsService.js: Elementos internos do modal de relatório não foram encontrados.");
        if(reportsErrorDiv) {
            reportsErrorDiv.textContent = "Erro ao carregar componentes do relatório.";
            reportsErrorDiv.classList.remove('hidden');
        }
        reportsModal.classList.remove('hidden'); // Mostra o modal mesmo com erro de componentes internos
        return;
    }
    
    reportsLoadingDiv.classList.remove('hidden');
    reportsErrorDiv.classList.add('hidden');
    reportsErrorDiv.textContent = ''; // Limpa mensagens de erro anteriores
    reportsContent.classList.add('hidden'); 
    reportsModal.classList.remove('hidden'); // Mostra o modal

    try {
        const reportData = await generateReportData();

        reportTotalTasksSpan.textContent = reportData.totalTasks;
        reportCompletedTasksSpan.textContent = reportData.completedTasks;
        reportPendingTasksSpan.textContent = reportData.pendingTasks;
        reportCompletionPercentageSpan.textContent = `${reportData.completionPercentage}%`;
        reportTotalTimeSpentSpan.textContent = reportData.totalTimeSpentFormatted;
        // if (reportCompletedTodaySpan) reportCompletedTodaySpan.textContent = reportData.completedToday;

        reportsContent.classList.remove('hidden');
    } catch (error) {
        console.error("Erro ao gerar ou exibir relatório:", error);
        if (reportsErrorDiv) {
            reportsErrorDiv.textContent = `Erro ao gerar relatório: ${error.message}`;
            reportsErrorDiv.classList.remove('hidden');
        }
    } finally {
        if (reportsLoadingDiv) reportsLoadingDiv.classList.add('hidden');
    }
}