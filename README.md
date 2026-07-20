# Orbit API Tester

**Orbit API Tester** is a professional-grade, fully local API testing client and Webhook Sandbox. Built entirely with React, TailwindCSS, and TypeScript, it rivals the capabilities of desktop applications like Postman and Insomnia, right from your browser. 

Designed for speed, beautiful UX, and power-user workflows, it provides developers with a robust environment to build, debug, organize, and monitor their APIs.

---

## 🌟 Core Features

### 1. Advanced Request Builder
Construct and dispatch highly customizable HTTP requests with an intuitive, tabbed interface.
*   **Methods:** `GET`, `POST`, `PUT`, `DELETE`, `PATCH`.
*   **Dynamic Auth:** Out-of-the-box support for `Bearer Tokens`, `Basic Auth`, and `OAuth 2.0` flows.
*   **Payload Support:** Native support for standard JSON payloads, GraphQL query structuring, and automatic schema-based form parsing.
*   **Real-time Validation:** Live JSON syntax linting immediately flags formatting errors before you send your request.

### 2. Sidebar Collections & Folders
Organize your API development seamlessly. 
*   **Save to Collection:** Click the **Save** button next to any request to assign it a name and organize it into a specific Folder or Collection (e.g., "Authentication API", "Billing Endpoints").
*   **Collapsible Tree View:** All saved endpoints appear dynamically in your left-hand Sidebar under grouped, collapsible folders for instant access later. 
*   **Favorites & Quick Search:** Star frequently used endpoints to pin them to the top, and use the rapid fuzzy-search to filter through hundreds of endpoints in milliseconds.

### 3. Multi-Tab & Split Workspace View (Side-by-Side)
Orbit allows you to juggle multiple complex workflows simultaneously.
*   **Unlimited Tabs:** Open as many independent request workspaces as you need.
*   **Split Right (Dual View):** Right-click (or hover over) any tab to "Split Right". This vertically splits your screen, allowing you to run two completely independent API requests side-by-side. Perfect for comparing a `Staging` endpoint directly against a `Production` endpoint.
*   **Resizable Layouts:** Drag the split boundaries to perfectly tune your workspace real estate, or toggle between Top/Bottom and Left/Right request layouts.

### 4. Environment Variables Manager
Stop copying and pasting API keys and local host addresses. 
*   **Custom Environments:** Create distinct environments (e.g., `Local`, `Staging`, `Prod`).
*   **Dynamic Injection:** Define key-value pairs (like `AUTH_TOKEN`) and seamlessly inject them into your Headers, URLs, and JSON bodies using the `{{AUTH_TOKEN}}` syntax. 
*   Switching environments instantly updates all variables across your entire workspace.

### 5. Workspace Data Backup (Export & Import)
*   **Data Portability:** With a single click of the **Data** button, export your entire development universe—open tabs, organized collections, history, and environments—into a secure `orbit-workspace.json` file.
*   **Restore Anywhere:** Instantly restore your environment on a new machine or browser by importing your `.json` backup. Never lose your API testing configurations again.

### 6. Code Snippet Export & cURL Import
*   **Code Generation:** Navigate to the "Snippets" tab to instantly translate your current visual request into copy-pasteable code for `cURL`, `Python (Requests)`, `Node.js (Axios)`, and `Javascript (Fetch)`.
*   **cURL Import:** Click the **Import cURL** button in the tab bar and paste a raw cURL command. Orbit will instantly parse the headers, URL, method, and payload, generating a brand new workspace tab.

### 7. Orbit Webhook Simulator (Sandbox)
A built-in ecosystem for simulating inbound, asynchronous webhooks to your local development server.
*   **Event Simulation:** Select from an array of pre-configured event payloads (e.g., Ticket Creation, ITIL updates) and dispatch them against your local endpoints (`localhost:3000/api/webhooks`).
*   **Concurrency Stress Testing:** Fire up to 20 webhook events concurrently to test race conditions and database locks on your server.
*   **HMAC Signature Signing:** The simulator automatically hashes payloads using your defined secret and attaches the `Orbit-Signature` header to guarantee cryptographic parity with real production webhooks.

### 8. Fully Persistent & Offline
Orbit API Tester is a fully client-side application. Your Request History, Favorites, Tab Layouts, Collections, and Environment Variables are safely stored in your browser's `localStorage`. No cloud accounts required.

---

## 🚀 Getting Started

### Prerequisites
Make sure you have Node.js (v16+) and npm installed on your machine.

### Installation & Execution
1. Clone or download the repository to your local machine.
2. Open a terminal and navigate to the project root directory.
3. Install the dependencies:
   ```bash
   npm install
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
5. Open your browser and navigate to `http://localhost:5173`.

---

## 🎨 Architecture & Tech Stack
*   **Framework:** React 18
*   **Tooling:** Vite
*   **Language:** TypeScript
*   **Styling:** TailwindCSS (with a custom design-system implementation for CSS Variables, glassmorphism, and dark-mode native aesthetics).
*   **Icons:** Lucide React

---
*Built to make API Development seamless, beautiful, and fast.*
