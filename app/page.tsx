"use client"
import React, { useState, useEffect, useRef, ChangeEvent } from 'react';

// Define types for CSV data
interface CSVRow {
    [key: string]: string; // Each row is an object with string keys and string values
}

// Define types for chat messages
interface ChatMessage {
    role: 'user' | 'ai' | 'system';
    text: string;
    chartSvg?: string | null; // Optional SVG string for charts
}

// Define type for the expected Gemini API response structure
interface GeminiApiResponse {
    candidates?: Array<{
        content?: {
            parts?: Array<{
                text?: string;
            }>;
        };
    }>;
    error?: { // Add error property to the API response interface
        code: number;
        message: string;
        status: string;
        details?: any[];
    };
}

// Define type for the parsed JSON response from Gemini's analysis
interface AnalysisResponse {
    analysis_text: string;
    chart_svg: string | null;
}

// Helper to parse CSV data
const parseCSV = (csvString: string): CSVRow[] => {
    const lines = csvString.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(header => header.trim());
    const data: CSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(value => value.trim());
        if (values.length === headers.length) {
            let row: CSVRow = {};
            for (let j = 0; j < headers.length; j++) {
                row[headers[j]] = values[j];
            }
            data.push(row);
        }
    }
    return data;
};

const App = () => {
    // App state with explicit TypeScript types
    const [csvData, setCsvData] = useState<CSVRow[]>([]);
    const [fileName, setFileName] = useState<string>('');
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom of chat history when it updates
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory]);

    // Handle CSV file upload
    const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]; // Use optional chaining for safety
        if (file) {
            setFileName(file.name);
            const reader = new FileReader();
            reader.onload = (e: ProgressEvent<FileReader>) => {
                const text = e.target?.result as string; // Assert type as string
                const parsedData = parseCSV(text);
                setCsvData(parsedData);
                setChatHistory([
                    { role: 'system', text: `File "${file.name}" loaded successfully. You can now ask questions about your data.` }
                ]);
            };
            reader.readAsText(file);
        }
    };

    // Send user question to the AI agent
    const sendMessage = async () => {
        if (!currentQuestion.trim() || csvData.length === 0) {
            setError("Please upload a CSV file and enter a question.");
            return;
        }

        setError(null);
        const userMessage = currentQuestion;
        setChatHistory(prev => [...prev, { role: 'user', text: userMessage }]);
        setCurrentQuestion('');
        setIsLoading(true);

        try {
            // Construct prompt for Gemini
            // We're sending a sample of data and its schema to avoid hitting token limits
            // while still giving the LLM context.
            const sampleData = csvData.slice(0, 10); // Send first 10 rows as sample
            const dataSchema = csvData.length > 0 ? Object.keys(csvData[0]).join(', ') : 'No data schema available.';

            const prompt = `Act as a Business Analyst. Analyze the provided tabular data based on the user's question.
            
            User's Question: "${userMessage}"
            
            Data Schema (Columns): ${dataSchema}
            
            Sample Data (first 10 rows):
            ${JSON.stringify(sampleData, null, 2)}
            
            Provide key metrics, trends, anomalies, and recommendations relevant to the question.
            If a visualization (bar, line, or pie chart) is suitable for the analysis, generate an SVG string for the chart.
            Ensure the SVG is well-formed and visually clear.
            
            Output your response in the following JSON format:
            {
              "analysis_text": "string (the textual analysis, insights, and recommendations)",
              "chart_svg": "string | null (SVG string of the chart, or null if no chart is generated)"
            }`;

            let chatRequestHistory = [];
            chatRequestHistory.push({ role: "user", parts: [{ text: prompt }] });

            const payload = {
                contents: chatRequestHistory,
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "OBJECT",
                        properties: {
                            "analysis_text": { "type": "STRING" },
                            // FIX: Changed ["STRING", "NULL"] to "STRING" as per Gemini API's schema expectation
                            "chart_svg": { "type": "STRING" } 
                        },
                        "propertyOrdering": ["analysis_text", "chart_svg"]
                    }
                }
            };

            // Use environment variable for API key. 
            // In a real Next.js app, NEXT_PUBLIC_MY_API_KEY would be loaded from .env.local
            // For Canvas, this will be automatically provided if apiKey is an empty string.
            const apiKey = process.env.NEXT_PUBLIC_MY_API_KEY || ''; 

            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result: GeminiApiResponse = await response.json(); // Type assertion for the API result

            if (response.status !== 200) {
                console.error("API Error:", result.error);
                setError(`API Error: ${result.error?.message || 'Unknown error'}`);
                return;
            }

            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                let responseText = result.candidates[0].content.parts[0].text;
                
                // Remove markdown code block fences if present
                if (responseText?.startsWith('```json')) { 
                    responseText = responseText.substring(7); // Remove '```json\n'
                }
                if (responseText?.endsWith('```')) { 
                    responseText = responseText.slice(0, -3); // Remove '\n```'
                }
                
                // Attempt to parse JSON, handle potential parsing errors
                let jsonResponse: AnalysisResponse;
                try {
                    jsonResponse = JSON.parse(responseText || '{}'); // Type assertion for parsed JSON, with fallback
                } catch (parseError: any) {
                    console.error("Failed to parse AI response as JSON:", responseText, parseError);
                    setError("The AI returned an unparseable response. Please try again or refine your question.");
                    return;
                }

                const { analysis_text, chart_svg } = jsonResponse;

                setChatHistory(prev => [
                    ...prev,
                    { role: 'ai', text: analysis_text, chartSvg: chart_svg }
                ]);
            } else {
                console.error("Unexpected API response structure: No candidates or content parts found.", result);
                setError("Failed to get a valid response from the AI. Please try again.");
            }

        } catch (err: any) { // Catch error with type any to access message property
            console.error("Error communicating with Gemini API:", err);
            setError(`There was an error processing your request: ${err.message}. Please try again.`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col font-inter antialiased">
            {/* Header */}
            <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 shadow-md rounded-b-lg">
                <div className="container mx-auto flex justify-between items-center">
                    <h1 className="text-3xl font-bold tracking-tight">Business Analyst AI</h1>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col md:flex-row p-4 space-y-4 md:space-y-0 md:space-x-4 container mx-auto">
                {/* File Upload & Chat Area */}
                <div className="flex-1 bg-white rounded-lg shadow-xl p-6 flex flex-col border border-gray-200">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Data Input & Chat</h2>

                    {/* File Upload */}
                    <div className="mb-6 border-b pb-4">
                        <label htmlFor="csv-upload" className="block text-gray-700 text-sm font-bold mb-2">
                            Upload CSV Data
                        </label>
                        <input
                            type="file"
                            id="csv-upload"
                            accept=".csv"
                            onChange={handleFileUpload}
                            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {fileName && <p className="mt-2 text-sm text-gray-600">Loaded: <span className="font-medium">{fileName}</span></p>}
                        {csvData.length > 0 && (
                            <p className="mt-1 text-xs text-green-600">
                                {csvData.length} rows and {Object.keys(csvData[0] || {}).length} columns detected.
                            </p>
                        )}
                    </div>

                    {/* Chat History */}
                    <div className="flex-1 overflow-y-auto pr-2 mb-4 custom-scrollbar" ref={chatContainerRef}>
                        {chatHistory.map((msg, index) => (
                            <div key={index} className={`mb-4 p-3 rounded-lg shadow-sm ${msg.role === 'user' ? 'bg-blue-50 text-blue-800 self-end ml-auto' : 'bg-gray-100 text-gray-800 self-start mr-auto'}`}>
                                <p className="font-semibold mb-1 capitalize">{msg.role}:</p>
                                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                {msg.chartSvg && (
                                    <div className="mt-3 bg-white p-2 rounded-md border border-gray-200">
                                        <h3 className="text-md font-semibold text-gray-700 mb-2">Generated Chart:</h3>
                                        <div dangerouslySetInnerHTML={{ __html: msg.chartSvg }} className="max-w-full h-auto" />
                                    </div>
                                )}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="mb-4 p-3 rounded-lg bg-gray-100 shadow-sm animate-pulse">
                                <p className="font-semibold">AI is thinking...</p>
                                <div className="h-2 bg-gray-300 rounded mt-2 w-3/4"></div>
                            </div>
                        )}
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md mb-4 text-sm" role="alert">
                            {error}
                        </div>
                    )}

                    {/* Chat Input */}
                    <div className="flex items-center space-x-3 mt-auto">
                        <input
                            type="text"
                            value={currentQuestion}
                            onChange={(e) => setCurrentQuestion(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                            placeholder={csvData.length === 0 ? "Please upload a CSV file first..." : "Ask a question about your data (e.g., 'Total revenue by region?')..."}
                            className="flex-1 p-3 text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-200 disabled:cursor-not-allowed"
                            disabled={isLoading || csvData.length === 0}
                        />
                        <button
                            onClick={sendMessage}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 disabled:bg-blue-300 disabled:cursor-not-allowed"
                            disabled={isLoading || !currentQuestion.trim() || csvData.length === 0}
                        >
                            Ask AI
                        </button>
                    </div>
                </div>
            </main>

            {/* Tailwind CSS Script */}

            {/* Using dangerouslySetInnerHTML to ensure CSS is rendered correctly */}
            <style dangerouslySetInnerHTML={{__html: `
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
                body {
                    font-family: 'Inter', sans-serif;
                }
                /* Custom scrollbar for chat history */
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #888;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #555;
                    border-radius: 10px;
                }
            `}} />
        </div>
    );
};

export default App;
