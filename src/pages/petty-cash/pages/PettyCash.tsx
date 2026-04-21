import { useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import PettyCashModal from '../components/PettyCashModal';
import { Transaction } from '../types';


interface PettyCashProps {
  onClose?: () => void;
}

export default function PettyCash({ onClose = () => {} }: PettyCashProps) {
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const handleSaveTransaction = (formData: any) => {
    const transactionId = formData.id || `TXN-${Date.now()}`;
    const newTransaction: Transaction = {
      ...formData,
      id: transactionId,
    };
    setTransactions([newTransaction, ...transactions]);

    // Save to localStorage
    const existingTransactions = JSON.parse(localStorage.getItem('pettyCashTransactions') || '[]');
    localStorage.setItem('pettyCashTransactions', JSON.stringify([newTransaction, ...existingTransactions]));
    
    // Close modal and redirect to transaction history
    onClose()
  };



  return (
    <div className="space-y-6">

      <div className="flex justify-between items-center">
       
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 md:px-6 py-3 bg-[#2a5298] text-white rounded-lg font-semibold hover:bg-[#1e3d70] transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
        >
          <FaPlus />
          <span className="hidden sm:inline">Add New Expense</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      <PettyCashModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTransaction}
      />
    </div>
  );
}