# Master Dashboard System

A unified administration portal for managing various sub-modules including Purchase Management, HR Products, Document Manager, Petty Cash, and Checklist Delegation.

## 🚀 Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Setup Environment Variables**:
   Create a `.env` file in the root directory (refer to `.env` for required keys like `VITE_MASTER_LOGIN_ID`).

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

## 📂 Project Structure

- `src/pages`: Individual module pages (HR, Purchase, etc.)
- `src/components`: Shared and module-specific components
- `src/services`: API and data fetching logic
- `server.js`: Proxy server for handling Google Apps Script requests

## ⚙️ Technologies Used

- React 19
- Vite
- Tailwind CSS
- Redux Toolkit
- React Router 7
- Framer Motion
