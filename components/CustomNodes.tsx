import React, { memo } from 'react';
import { Handle, Position, NodeProps, NodeToolbar } from 'reactflow';
import { 
  Play, 
  CheckCircle, 
  RefreshCw, 
  Zap, 
  AlertTriangle,
  Search,
  Save,
  Code,
  Signpost
} from 'lucide-react';

const HandleStyle = { width: '8px', height: '8px', background: '#94a3b8' };

// --- Header Node (Box with colored header) ---
// Used for Action, SOQL, DML, Subflow, Loop
const HeaderNode = ({ 
  data, 
  headerColor, 
  borderColor, 
  icon: Icon, 
  headerTitle,
  headerTextColor = "text-white"
}: { 
  data: any, 
  headerColor: string, 
  borderColor: string, 
  icon: any, 
  headerTitle: string,
  headerTextColor?: string
}) => (
  <div className={`w-[240px] bg-white rounded-lg shadow-md border border-gray-200 overflow-visible group`}>
    <Handle type="target" position={Position.Top} style={HandleStyle} />
    
    {/* Tooltip Toolbar - Shows on Selection */}
    {data.details && (
      <NodeToolbar 
        isVisible={undefined} /* undefined = visible when selected */
        position={Position.Top} 
        offset={10}
        className="bg-slate-800 text-slate-100 p-2 rounded shadow-xl border border-slate-700 max-w-xs text-xs font-mono z-50 pointer-events-none"
      >
        <div className="font-semibold text-slate-400 text-[10px] mb-1 uppercase tracking-wider">Source Code</div>
        <div className="whitespace-pre-wrap">{data.details}</div>
      </NodeToolbar>
    )}

    {/* Header Bar */}
    <div className={`${headerColor} ${headerTextColor} px-3 py-1.5 flex items-center gap-2 rounded-t-lg`}>
      <Icon size={14} className="stroke-[2.5]" />
      <span className="text-xs font-bold uppercase tracking-wide">{headerTitle}</span>
    </div>
    
    {/* Body */}
    <div className={`p-3 border-l-4 ${borderColor} bg-white rounded-b-lg`}>
      <div className="font-semibold text-gray-800 text-sm line-clamp-2 leading-snug">
        {data.label}
      </div>
      {/* Code Snippet removed from body, now in toolbar */}
    </div>

    <Handle type="source" position={Position.Bottom} style={HandleStyle} />
  </div>
);

export const StartNode = memo(({ data }: NodeProps) => (
  <div className="bg-green-100 border-2 border-green-500 text-green-800 px-4 py-2 rounded-full shadow-sm min-w-[140px] flex items-center justify-center gap-2">
    <Handle type="target" position={Position.Top} className="opacity-0" />
    <Play size={16} fill="currentColor" className="text-green-600" />
    <div>
        <div className="text-xs font-bold uppercase">Start</div>
        {data.label && <div className="text-[10px] font-medium opacity-80 max-w-[150px] truncate">{data.label}</div>}
    </div>
    <Handle type="source" position={Position.Bottom} style={HandleStyle} />
  </div>
));

export const EndNode = memo(({ data }: NodeProps) => (
  <div className="bg-red-100 border-2 border-red-500 text-red-800 px-4 py-2 rounded-full shadow-sm min-w-[140px] flex items-center justify-center gap-2">
    <Handle type="target" position={Position.Top} style={HandleStyle} />
    <CheckCircle size={16} className="text-red-600" />
    <div>
        <div className="text-xs font-bold uppercase">End</div>
    </div>
    <Handle type="source" position={Position.Bottom} className="opacity-0" />
  </div>
));

// Diamond Node for Decisions
export const DecisionNode = memo(({ data }: NodeProps) => (
  <div className="relative w-[280px] h-[200px] flex items-center justify-center">
    <Handle type="target" position={Position.Top} style={{ ...HandleStyle, top: '20px' }} />
    
    {/* Tooltip Toolbar for Decision */}
    {data.details && (
      <NodeToolbar 
        isVisible={undefined} 
        position={Position.Top} 
        offset={-40}
        className="bg-slate-800 text-slate-100 p-2 rounded shadow-xl border border-slate-700 max-w-xs text-xs font-mono z-50 pointer-events-none"
      >
        <div className="font-semibold text-slate-400 text-[10px] mb-1 uppercase tracking-wider">Condition Logic</div>
        <div className="whitespace-pre-wrap">{data.details}</div>
      </NodeToolbar>
    )}

    {/* Diamond Shape Background */}
    <div className="absolute w-[140px] h-[140px] bg-orange-50 border-2 border-orange-400 rotate-45 shadow-sm rounded-sm z-0"></div>
    
    {/* Content (Not Rotated) */}
    <div className="relative z-10 flex flex-col items-center justify-center text-center px-2 pointer-events-none transform -translate-y-1">
       <div className="mb-2 bg-orange-100 p-1.5 rounded-md border border-orange-200">
          <Signpost size={20} className="text-orange-600" />
       </div>
       <div className="text-xs font-bold text-orange-900 bg-white/50 backdrop-blur-[1px] px-2 py-0.5 rounded max-w-[160px] leading-tight break-words shadow-sm border border-orange-100/50">
         {data.label}
       </div>
    </div>

    <Handle type="source" position={Position.Bottom} style={{ ...HandleStyle, bottom: '20px' }} />
    {/* Side handles for complex routing if needed */}
    <Handle type="source" id="left" position={Position.Left} style={{ ...HandleStyle, left: '60px', opacity: 0 }} />
    <Handle type="source" id="right" position={Position.Right} style={{ ...HandleStyle, right: '60px', opacity: 0 }} />
  </div>
));

export const ActionNode = memo(({ data }: NodeProps) => (
  <HeaderNode 
    data={data}
    headerColor="bg-blue-600"
    borderColor="border-blue-600"
    icon={Zap}
    headerTitle="Action"
  />
));

export const SOQLNode = memo(({ data }: NodeProps) => (
  <HeaderNode 
    data={data}
    headerColor="bg-violet-600"
    borderColor="border-violet-600"
    icon={Search}
    headerTitle="Get Records"
  />
));

export const DMLNode = memo(({ data }: NodeProps) => (
  <HeaderNode 
    data={data}
    headerColor="bg-pink-600"
    borderColor="border-pink-600"
    icon={Save}
    headerTitle={data.label.toLowerCase().includes('create') ? 'Create Records' : 'Update Records'}
  />
));

export const SubflowNode = memo(({ data }: NodeProps) => (
  <HeaderNode 
    data={data}
    headerColor="bg-indigo-600"
    borderColor="border-indigo-600"
    icon={Code}
    headerTitle="Subflow"
  />
));

// Refactored Loop Node to match the HeaderNode style (Solid Orange)
export const LoopNode = memo(({ data }: NodeProps) => (
  <HeaderNode 
    data={data}
    headerColor="bg-orange-500"
    borderColor="border-orange-500"
    icon={RefreshCw}
    headerTitle="Loop"
  />
));

export const ErrorNode = memo(({ data }: NodeProps) => (
    <div className="bg-red-50 border border-red-300 p-2 rounded text-red-800 text-xs flex items-center gap-2 max-w-[150px]">
         <Handle type="target" position={Position.Top} style={HandleStyle} />
         <AlertTriangle size={12} />
         {data.label}
         <Handle type="source" position={Position.Bottom} style={HandleStyle} />
    </div>
));