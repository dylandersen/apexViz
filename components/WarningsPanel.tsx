import React from 'react';
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import { AnalysisWarning } from '../types';

interface WarningsPanelProps {
  warnings: AnalysisWarning[];
}

export const WarningsPanel: React.FC<WarningsPanelProps> = ({ warnings }) => {
  if (warnings.length === 0) return null;

  return (
    <div className="bg-white border-t border-gray-200 p-4 max-h-48 overflow-y-auto">
      <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
        <ShieldAlert size={16} />
        Analysis Report
      </h3>
      <div className="space-y-2">
        {warnings.map((warning, idx) => (
          <div key={idx} className={`p-2 rounded text-sm flex items-start gap-2 ${
            warning.type === 'limit' ? 'bg-red-50 text-red-800 border border-red-200' :
            warning.type === 'security' ? 'bg-orange-50 text-orange-800 border border-orange-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            <span className="mt-0.5">
                {warning.type === 'limit' ? <AlertTriangle size={14} /> : <Info size={14} />}
            </span>
            <div>
              <span className="font-semibold capitalize">{warning.type}:</span> {warning.message}
              {warning.line && <span className="ml-1 text-xs opacity-75">(Line {warning.line})</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
