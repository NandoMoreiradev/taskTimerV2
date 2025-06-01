// api/generateSubtasks.js
export default async function handler(request, response) {
    // Permitir apenas requisições POST


    if (request.method !== 'POST') {
        response.status(405).json({ message: 'Method Not Allowed' });
        return;
    }

    // Obter a descrição da tarefa do corpo da requisição
    const { taskDescription } = request.body;

    if (!taskDescription) {
        response.status(400).json({ message: 'Bad Request: taskDescription is required' });
        return;
    }

    // Acessar a API Key da Gemini armazenada como Variável de Ambiente no Vercel
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    console.log('GEMINI_API_KEY lida do ambiente pela serverless function:', GEMINI_API_KEY);
    
    if (!GEMINI_API_KEY) {
        console.error('GEMINI_API_KEY is not set in environment variables.');
        response.status(500).json({ message: 'Server configuration error: API key missing.' });
        return;
    }

    const prompt = `Dada a seguinte tarefa principal: "${taskDescription}", por favor, quebre-a em 3 a 5 subtarefas menores, claras e acionáveis. Cada subtarefa deve ser uma frase curta. Retorne apenas a lista de subtarefas, cada uma em uma nova linha. Não inclua números, marcadores (como '*' ou '-') ou qualquer texto introdutório/conclusivo.`;
    
    const payload = {
        contents: [{ role: "user", parts: [{ text: prompt }] }]
    };
    const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    try {
        const geminiResponse = await fetch(geminiApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const responseData = await geminiResponse.json(); // Tenta parsear JSON mesmo se não for ok, para logs

        if (!geminiResponse.ok) {
            console.error('Gemini API Error:', responseData); // Loga o corpo do erro da Gemini
            // Tenta usar a mensagem de erro da Gemini, se disponível
            const errorMessage = responseData?.error?.message || `Gemini API Error: Status ${geminiResponse.status}`;
            response.status(geminiResponse.status).json({ message: errorMessage, details: responseData });
            return;
        }
        
        if (responseData.candidates && responseData.candidates.length > 0 &&
            responseData.candidates[0].content && responseData.candidates[0].content.parts &&
            responseData.candidates[0].content.parts.length > 0) {
            const text = responseData.candidates[0].content.parts[0].text;
            const subtasks = text.split('\n').map(s => s.trim()).filter(s => s.length > 0);
            response.status(200).json({ subtasks }); // Envia as subtarefas de volta para o cliente
        } else {
            console.error("Resposta inesperada da API Gemini:", responseData);
            response.status(500).json({ message: 'Failed to parse subtasks from Gemini response.' });
        }

    } catch (error) {
        console.error('Error in serverless function:', error);
        response.status(500).json({ message: `Internal Server Error: ${error.message}` });
    }
}