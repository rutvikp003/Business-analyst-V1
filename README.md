# Business Analyst AI 📊

An intuitive web application that leverages Google Gemini AI to provide instant, natural language-driven business insights and visualizations from your CSV data. Democratizing data analysis, making it accessible to everyone.

## Table of Contents

* [About The Project](#about-the-project)
* [Features](#features)
* [How It Works](#how-it-works)
* [Tech Stack](#tech-stack)
* [Getting Started](#getting-started)
    * [Prerequisites](#prerequisites)
    * [Installation](#installation)
    * [Environment Variables](#environment-variables)
* [Usage](#usage)
* [Security Considerations](#security-considerations)
* [License](#license)
* [Contact](#contact)

---

## About The Project

In today's fast-paced, data-driven environment, the ability to quickly extract actionable insights from raw data is paramount. The **Business Analyst AI** project aims to simplify this process. It provides a user-friendly web interface where you can upload tabular data (CSV) and receive sophisticated business analysis and visualizations simply by asking natural language questions.

This application acts as your personal AI-powered business analyst, transforming complex data into digestible insights, identifying key metrics, trends, anomalies, and offering strategic recommendations.

## Features

* **Effortless CSV Upload:** Simply drag and drop your tabular data files.
* **Natural Language Querying:** Ask complex business questions in plain English (e.g., "What is the total revenue by region?").
* **AI-Powered Insights:** Receive comprehensive textual analysis, including KPIs, trends, anomalies, and actionable recommendations.
* **Dynamic Data Visualizations:** Automatically generates and displays relevant SVG charts (bar, line, pie) directly within the chat interface when suitable.

## How It Works

The application makes secure, server-side calls to the Google Gemini API. Your natural language questions, along with a sample of your CSV data, are sent to a Next.js API route. Gemini processes this information, acting as a business analyst to provide structured JSON responses containing both the analysis text and, if applicable, an SVG string for a chart. This ensures your sensitive API key is never exposed on the client-side.

## Tech Stack

* **Frontend:**
    * [React](https://react.dev/)
    * [Next.js](https://nextjs.org/) (for React framework and API Routes)
    * [TypeScript](https://www.typescriptlang.org/) (for type safety and better maintainability)
    * [Tailwind CSS](https://tailwindcss.com/) (for rapid and responsive UI development)
* **AI Integration:**
    * [Google Gemini API](https://ai.google.dev/) (specifically `gemini-2.0-flash` for its efficiency and structured output capabilities)

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

* Node.js (v18 or higher recommended)
* npm or yarn
* A Google Gemini API Key (obtainable for free from [Google AI Studio](https://aistudio.google.com/))

### Installation

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/rutvikp003/Business-analyst.git](https://github.com/rutvikp003/Business-analyst.git)
    cd business-analyst-ai
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

### Environment Variables

To securely use the Google Gemini API, you **must** configure your API key as an environment variable.

1.  Create a file named `.env.local` in the root of your project:
    ```
    .env.local
    ```
2.  Add your Gemini API key to this file:
    ```
    GEMINI_API_KEY=YOUR_GOOGLE_GEMINI_API_KEY
    ```
    Replace `YOUR_GOOGLE_GEMINI_API_KEY` with the actual API key you obtained from Google AI Studio.

    **Important:** Ensure `.env.local` is included in your `.gitignore` file to prevent your API key from being committed to your public repository.

### Running the Development Server

1.  **Start the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
2.  Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Usage

1.  **Upload CSV:** Click the "Upload CSV Data" input and select your CSV file. The application will confirm successful loading.
2.  **Ask Questions:** Type your questions about the data into the input field at the bottom of the chat.
3.  **Get Insights:** Press Enter or click "Ask AI" to send your query. The AI will process the data and provide a textual analysis and/or a generated chart.

## Security Considerations

All Google Gemini API calls are securely proxied through a **Next.js API Route (server-side)**. This ensures your `GEMINI_API_KEY` is never exposed in the client-side code or your public Git repository. When deploying to platforms like Vercel, ensure you configure the `GEMINI_API_KEY` environment variable in their settings.

## Contact

[Your Name/Alias] - [Your LinkedIn Profile URL (Optional)] - [Your Email Address (Optional)]

Project Link: [https://github.com/rutvikp003/Business-analyst.git](https://github.com/rutvikp003/Business-analyst.git)

---