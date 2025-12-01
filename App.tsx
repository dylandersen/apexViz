import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap, 
  Node, 
  Edge,
  useNodesState,
  useEdgesState,
  MarkerType
} from 'reactflow';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-java';

import { 
  Play, 
  Download, 
  Trash2, 
  Maximize2,
  Code2,
  Activity,
  Loader2,
  Zap,
  Move
} from 'lucide-react';

import { 
  StartNode, 
  EndNode, 
  DecisionNode, 
  ActionNode, 
  SOQLNode, 
  DMLNode, 
  LoopNode, 
  SubflowNode, 
  ErrorNode
} from './components/CustomNodes';

import { WarningsPanel } from './components/WarningsPanel';
import { parseApexCode } from './services/geminiService';
import { getLayoutedElements } from './services/layoutService';
import { SAMPLE_APEX_CODE, ApexNodeType, AnalysisWarning } from './types';

// Map specific custom node types
const nodeTypes = {
  [ApexNodeType.START]: StartNode,
  [ApexNodeType.END]: EndNode,
  [ApexNodeType.DECISION]: DecisionNode,
  [ApexNodeType.ACTION]: ActionNode,
  [ApexNodeType.SOQL]: SOQLNode,
  [ApexNodeType.DML]: DMLNode,
  [ApexNodeType.LOOP]: LoopNode,
  [ApexNodeType.SUBFLOW]: SubflowNode,
  [ApexNodeType.ERROR]: ErrorNode
};

// Simple draggable wrapper for MiniMap
const DraggableMiniMapWrapper = () => {
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { 
      x: e.clientX - position.x, 
      y: e.clientY - position.y 
    };
    e.stopPropagation();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        // Calculate new position relative to bottom-right or simply absolute
        // Here we use absolute positioning from bottom-right as base
        // But for simplicity, let's just assume fixed to window coordinates for this wrapper
        // Note: standard MiniMap is usually absolute inside ReactFlow. 
        // We will just use standard style overrides.
        const newX = e.clientX - dragStartRef.current.x;
        const newY = e.clientY - dragStartRef.current.y;
        setPosition({ x: newX, y: newY });
      }
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div 
      style={{ 
        position: 'absolute', 
        left: position.x, 
        top: position.y, 
        zIndex: 5,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      className="bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden"
    >
        <div 
            onMouseDown={handleMouseDown}
            className="h-6 bg-slate-100 border-b border-slate-200 flex items-center justify-center cursor-move hover:bg-slate-200 transition-colors"
            title="Drag MiniMap"
        >
            <Move size={12} className="text-slate-400" />
        </div>
        <div className="pointer-events-auto">
            <MiniMap 
                nodeColor={(n) => {
                    if (n.type === ApexNodeType.START) return '#86efac';
                    if (n.type === ApexNodeType.END) return '#fca5a5';
                    if (n.type === ApexNodeType.DECISION) return '#fdba74';
                    if (n.type === ApexNodeType.DML) return '#f472b6';
                    if (n.type === ApexNodeType.SOQL) return '#a78bfa';
                    if (n.type === ApexNodeType.LOOP) return '#f97316';
                    return '#cbd5e1';
                }} 
                style={{ position: 'relative', margin: 0, border: 'none', borderRadius: 0, bottom: 'auto', right: 'auto' }}
                maskColor="rgba(241, 245, 249, 0.7)"
            />
        </div>
    </div>
  );
};

export default function App() {
  const [code, setCode] = useState(SAMPLE_APEX_CODE);
  const [loading, setLoading] = useState(false);
  const [warnings, setWarnings] = useState<AnalysisWarning[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const handleVisualize = useCallback(async () => {
    if (!code.trim()) return;

    setLoading(true);
    setWarnings([]);
    
    try {
      const result = await parseApexCode(code);
      
      const flowNodes: Node[] = result.nodes.map(n => ({
        id: n.id,
        type: n.type,
        data: { label: n.label, details: n.details, line: n.line },
        position: { x: 0, y: 0 } // Layout service will fix this
      }));

      const flowEdges: Edge[] = result.edges.map(e => {
        // Determine edge color based on label (True/False)
        const labelLower = e.label?.toLowerCase() || '';
        const isTrue = labelLower.includes('true') || labelLower.includes('yes');
        const isFalse = labelLower.includes('false') || labelLower.includes('no');

        let strokeColor = '#94a3b8'; // Default slate-400
        if (isTrue) strokeColor = '#10b981'; // emerald-500
        if (isFalse) strokeColor = '#f43f5e'; // rose-500

        return {
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label,
          type: 'smoothstep', // Use smoothstep for flowchart look
          animated: e.animated || false,
          markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: strokeColor },
          style: { strokeWidth: 2, stroke: strokeColor },
          labelStyle: { fill: strokeColor, fontWeight: 700, fontSize: 11 },
          labelBgStyle: { fill: '#ffffff', fillOpacity: 0.8 },
          labelBgBorderRadius: 4,
        };
      });

      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(flowNodes, flowEdges);
      
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      setWarnings(result.warnings);

    } catch (error) {
      console.error(error);
      alert("Failed to analyze code. Please ensure your API Key is valid or try simpler code.");
    } finally {
      setLoading(false);
    }
  }, [code, setNodes, setEdges]);

  const handleClear = () => {
    setCode('');
    setNodes([]);
    setEdges([]);
    setWarnings([]);
  };

  const handleDownload = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ nodes, edges, warnings }, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "flow_analysis.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const highlightCode = (code: string) => Prism.highlight(code, Prism.languages.java || Prism.languages.clike, 'java');

  // Handle Node Selection / Click to highlight code
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (!node.data.line) return;

    // Open sidebar if closed so user can see highlight
    if (!isSidebarOpen) setIsSidebarOpen(true);

    // Find the textarea inside the Editor component
    // Note: react-simple-code-editor renders a textarea inside a container. 
    // We give it an ID to find it easily.
    const textarea = document.getElementById('apex-editor-textarea') as HTMLTextAreaElement;
    
    if (textarea) {
        const lineNum = node.data.line;
        const lines = code.split('\n');
        
        // Calculate start and end character indices for the line
        let startCharIndex = 0;
        for (let i = 0; i < lineNum - 1; i++) {
            // Add length of line plus newline char
            startCharIndex += lines[i].length + 1;
        }
        
        // If line is out of bounds, safety check
        if (startCharIndex >= code.length) return;

        const lineLength = lines[lineNum - 1]?.length || 0;
        const endCharIndex = startCharIndex + lineLength;

        textarea.focus();
        textarea.setSelectionRange(startCharIndex, endCharIndex);
        
        // Attempt to scroll to the line
        // Approximate line height ~20px
        const lineHeight = 20; 
        const scrollPos = (lineNum - 1) * lineHeight - 100; // -100 to center it a bit
        textarea.scrollTop = scrollPos > 0 ? scrollPos : 0;
    }
  }, [code, isSidebarOpen]);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 overflow-hidden font-inter">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-20 shadow-sm relative">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-xl shadow-md">
            <Zap className="text-white" size={20} fill="currentColor" />
          </div>
          <div>
             <h1 className="font-bold text-slate-800 text-lg leading-tight tracking-tight">Apex<span className="text-blue-600">Viz</span></h1>
             <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">Visualize Your Apex</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
             <button 
                onClick={handleDownload}
                disabled={nodes.length === 0}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
             >
                <Download size={16} /> <span>Export</span>
             </button>
             <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
            {!process.env.API_KEY && (
                 <span className="text-xs text-red-500 font-semibold px-2 py-1 bg-red-50 border border-red-200 rounded">API Key Missing</span>
            )}
          <span className="text-xs text-slate-400 font-medium">Made by Dylan Andersen</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Panel: Code Editor (Dark Mode) */}
        <div className={`${isSidebarOpen ? 'w-[40%] min-w-[400px]' : 'w-0'} transition-all duration-300 flex flex-col border-r border-slate-700 bg-[#1e1e1e] relative shadow-xl z-10`}>
          <div className="bg-[#252526] border-b border-[#333] p-3 flex items-center justify-between shrink-0">
            <span className="text-xs font-semibold text-gray-300 flex items-center gap-2">
              <Code2 size={14} className="text-blue-400" /> Apex Editor
            </span>
            <button onClick={handleClear} className="p-1.5 hover:bg-[#333] rounded text-gray-400 hover:text-white transition-colors" title="Clear Code">
              <Trash2 size={14} />
            </button>
          </div>
          
          <div className="flex-1 overflow-auto relative font-mono text-sm scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
            <Editor
              value={code}
              onValueChange={setCode}
              highlight={highlightCode}
              padding={20}
              textareaId="apex-editor-textarea" // ID for locating textarea for highlighting
              className="min-h-full font-mono tracking-wide"
              style={{
                fontFamily: '"Fira Code", monospace',
                fontSize: 13,
                backgroundColor: '#1e1e1e',
                color: '#d4d4d4', // VS Code default text color
              }}
              textareaClassName="focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            />
          </div>

          <div className="p-4 border-t border-[#333] bg-[#252526]">
            <button 
              onClick={handleVisualize}
              disabled={loading || !code.trim()}
              className={`w-full py-3 rounded-lg font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all transform ${
                loading 
                  ? 'bg-blue-500/50 cursor-not-allowed text-white/50' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 active:scale-[0.98]'
              }`}
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} fill="currentColor" />}
              {loading ? 'ANALYZING...' : 'VISUALIZE FLOW'}
            </button>
          </div>
        </div>

        {/* Toggle Sidebar Button */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`absolute bottom-6 z-30 bg-white border border-slate-200 shadow-lg p-2 rounded-full hover:bg-slate-50 text-slate-600 transition-all duration-300 ${isSidebarOpen ? 'left-[40%] -ml-5' : 'left-4'}`}
        >
          <Maximize2 size={18} />
        </button>

        {/* Right Panel: Visualization */}
        <div className="flex-1 bg-slate-50 relative flex flex-col">
            <div className="flex-1 h-full w-full relative">
                {nodes.length === 0 && !loading && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                            <Activity size={40} className="text-slate-300" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-700 mb-2">Ready to Map</h3>
                        <p className="text-sm text-slate-500 max-w-sm">Paste your Apex Class or Trigger code on the left and hit <strong>Visualize</strong> to see the logic flow.</p>
                    </div>
                )}
                
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeClick={handleNodeClick}
                    nodeTypes={nodeTypes}
                    fitView
                    minZoom={0.1}
                    maxZoom={2}
                    defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
                    attributionPosition="bottom-right"
                    proOptions={{ hideAttribution: true }}
                >
                    <Background color="#cbd5e1" gap={20} size={1} />
                    <Controls className="!bg-white !border-slate-200 !shadow-sm !rounded-lg !m-4" />
                    <DraggableMiniMapWrapper />
                </ReactFlow>
            </div>

            {/* Warnings Panel */}
            <WarningsPanel warnings={warnings} />
        </div>
      </main>
    </div>
  );
}