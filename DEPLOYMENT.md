# Deployment Guide (Proxmox LXC)

This guide explains how to deploy Knowledge Tool in a Docker-based environment, such as an LXC container on Proxmex.

## Prerequisites

1.  **LXC Container**: A running Linux LXC (Ubuntu/Debian recommended).
2.  **Docker & Docker Compose**: Installed and running within the LXC.
3.  **LLM Server**: An accessible LLM server (e.g., LM Studio) reachable via LAN IP.

## Setup Instructions

### 1. Clone the Repository
Clone this repository into your LXC container:
```bash
git clone <your-repo-url>
cd knowledge-tool
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory to configure the connection to your LLM server.

```bash
# .env
LLM_BASE_URL=http://<YOUR_LM_STUDIO_IP>:1234/v1
LLM_API_KEY=lm-studio
LLM_CHAT_MODEL=local-model
LLM_EMBEDDING_MODEL=text-embedding-nomic-embed-text-v1.5
EMBEDDING_DIMENSIONS=768
```
*Replace `<YOUR_LM_STUDIO_IP>` with the actual LAN IP of your LM Studio host.*

### 3. Launch the Application
Start the containers in detached mode:
```bash
docker compose up -d
```

### 4. Access the App
Once the containers are running, access the application via your browser at:
`http://<LXC_IP_ADDRESS>:3456`

## Maintenance

**View Logs:**
```bash
docker compose logs -f
```

**Stop the Application:**
```bash
docker compose down
```

**Update the App:**
```bash
git pull
docker compose up -d --build
```
