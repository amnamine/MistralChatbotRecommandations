# Smart AI Agent: Personalized Campaign Automation System

A premium, end-to-end artificial intelligence campaign manager and messaging platform tailored for telecommunications environments. This project automates customer profiling, segment analysis, and personalized multi-lingual message generation using Retrieval-Augmented Generation (RAG) powered by the Mistral 7B LLM API.

---

## System Architecture

The application is built using a modern decoupled architecture:

```mermaid
graph TD
    A[Frontend Dashboard: HTML5/CSS3/JS] -->|Requests / Port 8080| B[Java Campaign Gateway]
    B -->|Logs Campaigns| C[(campaign_runs.json)]
    B -->|Proxy Requests / Port 8000| D[FastAPI Backend Server]
    D -->|Loads Context| E[cliensts_test2.csv]
    D -->|Queries RAG Examples| F[generated_sms (2).csv]
    D -->|API Calls| G[Mistral 7B LLM API]
```

### 1. AI Messaging Engine ([sms_generator.py](file:///d:/AMINE2/COURS%20FAC/travaux/OO_Chatbot/sms_generator.py))
- Communicates directly with the Mistral 7B LLM API using a secure, hardcoded key.
- Incorporates a RAG mechanism that filters `generated_sms (2).csv` to match language context (French, Arabic, Algerian Darija) and behavioral personas. It feeds these matching records as instructions to the prompt to maintain strict tone, style, and vocabulary requirements.

### 2. Python API Backend ([main.py](file:///d:/AMINE2/COURS%20FAC/travaux/OO_Chatbot/main.py))
- Powered by FastAPI, running locally on port `8000`.
- Reads customer records from `cliensts_test2.csv` and exposes endpoints for data segmentation, statistics, and single/batch message processing.

### 3. Java Gateway Orchestrator ([TelecomCampaignGateway.java](file:///d:/AMINE2/COURS%20FAC/travaux/OO_Chatbot/TelecomCampaignGateway.java))
- An HTTP Server compiled and executed in Java 21, running on port `8080`.
- Acts as a proxy interface forwarding requests from the frontend UI to the FastAPI server.
- Intercepts and records campaign runs locally into `campaign_runs.json` to track transaction logs.

### 4. Interactive Web Interface ([index.html](file:///d:/AMINE2/COURS%20FAC/travaux/OO_Chatbot/index.html), [style.css](file:///d:/AMINE2/COURS%20FAC/travaux/OO_Chatbot/style.css), [app.js](file:///d:/AMINE2/COURS%20FAC/travaux/OO_Chatbot/app.js))
- A premium, dark-themed responsive dashboard with vibrant glassmorphism design.
- Displays metrics, persona segment charts, campaign logs, and includes an interactive SMS sandbox mock phone preview.

---

## File Structure

- [cliensts_test2.csv](file:///d:/AMINE2/COURS%20FAC/travaux/OO_Chatbot/cliensts_test2.csv): Target customer segmentation parameters.
- [generated_sms (2).csv](file:///d:/AMINE2/COURS%20FAC/travaux/OO_Chatbot/generated_sms%20(2).csv): Master reference dataset containing past message examples.
- [sms_generator.py](file:///d:/AMINE2/COURS%20FAC/travaux/OO_Chatbot/sms_generator.py): Module calling Mistral API with RAG context.
- [main.py](file:///d:/AMINE2/COURS%20FAC/travaux/OO_Chatbot/main.py): FastAPI server exposing JSON endpoints.
- [TelecomCampaignGateway.java](file:///d:/AMINE2/COURS%20FAC/travaux/OO_Chatbot/TelecomCampaignGateway.java): Java HTTP proxy and JSON logger.
- [campaign_runs.json](file:///d:/AMINE2/COURS%20FAC/travaux/OO_Chatbot/campaign_runs.json): Local transaction database for campaign runs.
- [index.html](file:///d:/AMINE2/COURS%20FAC/travaux/OO_Chatbot/index.html), [style.css](file:///d:/AMINE2/COURS%20FAC/travaux/OO_Chatbot/style.css), [app.js](file:///d:/AMINE2/COURS%20FAC/travaux/OO_Chatbot/app.js): Premium dashboard web application.
- [run.bat](file:///d:/AMINE2/COURS%20FAC/travaux/OO_Chatbot/run.bat): Shell runner script to boot Python/Java servers and open the dashboard.

---

## Setup and Running

1. **Python Dependencies**:
   Install required Python packages:
   ```bash
   pip install fastapi uvicorn requests pandas
   ```

2. **Launch Application**:
   Run the launcher batch file in the root workspace directory:
   ```cmd
   run.bat
   ```
   This script will automatically terminate older processes running on ports `8000` or `8080`, start the FastAPI backend, compile and boot the Java Gateway service, and launch the Campaign Dashboard directly in your web browser.
