# 🌙 LunaOS

LunaOS is a personal, all-in-one operating system and dashboard designed to centralize life's most important digital assets. Built with modern web technologies, it features a beautiful, dynamic, and highly responsive user interface.

## ✨ Features

- **🔒 Vault (Google Photos Alternative):** A secure, high-performance media gallery backed by Cloudflare R2 and Supabase Edge Functions. Includes facial recognition, smart batching, and zero-layout-shift image loading.
- **📚 Media Library:** A dedicated, private space for confidential documents and important files.
- **📝 Study Notes:** Advanced note-taking and knowledge management system.
- **📈 Life Dashboard:** A centralized hub tracking habits, daily todos, streaks, and personal insights.
- **🤖 Luna AI:** An integrated AI assistant powered by Groq.
- **📅 Time Capsule & Yearly Review:** Tools for personal reflection and memory preservation.

## 🛠️ Tech Stack

- **Frontend:** React (Vite)
- **Styling:** Vanilla CSS with modern glassmorphism, dynamic micro-animations, and fluid grid layouts.
- **Backend & Auth:** Supabase (PostgreSQL, Edge Functions, Authentication)
- **Object Storage:** Cloudflare R2 (Blazing fast global CDN for media)
- **AI Integration:** Groq API

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- A Supabase project
- A Cloudflare R2 bucket

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mdismailzzz02/lunaos.git
   cd lunaos
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Copy the example environment file and fill in your keys:
   ```bash
   cp .env.example .env
   ```
   *Required variables include Supabase credentials, Groq API key, Google Client ID, and Cloudflare R2 settings.*

4. **Run the development server:**
   ```bash
   npm run dev
   ```

## 🔒 Security & Architecture

LunaOS employs a two-bucket storage architecture for maximum security and performance:
1. **Public Media Bucket (`luna-vault`):** Uses Cloudflare's `r2.dev` CDN for instantaneous, 0ms latency photo and video loading.
2. **Private Document Bucket (`luna-media-library`):** Fully restricted bucket requiring 15-minute expiring presigned URLs generated securely via Supabase Edge Functions.

## 📜 License
This project is for personal use.
