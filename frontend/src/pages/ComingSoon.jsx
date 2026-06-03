import React from 'react';
import { Construction } from 'lucide-react';

const ComingSoon = ({ title }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full bg-[#f8f9fa] p-8 text-center">
      <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-6">
        <Construction size={40} className="text-orange-500" />
      </div>
      <h2 className="text-3xl font-bold text-slate-900 mb-4">{title}</h2>
      <p className="text-slate-500 max-w-md">
        We are working hard to bring you the {title} feature. Stay tuned for upcoming updates to your restaurant dashboard!
      </p>
    </div>
  );
};

export default ComingSoon;
