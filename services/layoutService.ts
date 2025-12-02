import dagre from 'dagre';
import { Node, Edge, Position } from 'reactflow';
import { ApexNodeType } from '../types';

// We use a standardized width for calculation to ensure centers align vertically
const CALC_WIDTH = 300; 
const BASE_HEIGHT = 80; // Reduced height (was 100) since details are now in tooltips

export const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({ 
    rankdir: direction,
    // Align undefined (center) produces the straightest trees when widths are uniform
    nodesep: 140, // Horizontal separation between parallel branches
    ranksep: 120, // Vertical separation between levels
    edgesep: 50,
    marginx: 50,
    marginy: 50
  });

  nodes.forEach((node) => {
    // VISUAL width vs LAYOUT width.
    // By forcing all major nodes to have the same CALC_WIDTH in the graph engine,
    // Dagre will align their center points exactly on the vertical axis.
    let width = CALC_WIDTH;
    let height = BASE_HEIGHT;
    
    // Decisions need more vertical space in calculation due to diamond shape
    if (node.type === ApexNodeType.DECISION) {
        height = 160; // Slightly reduced
    } else if (node.type === ApexNodeType.START || node.type === ApexNodeType.END) {
        // Even Start/End work better if we treat them as full width for alignment,
        // though visually they are smaller.
        width = CALC_WIDTH; 
        height = 80;
    }

    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    // Edge Weighting Logic:
    // We want the "main flow" (Success, True, Next) to be straight (heavier weight).
    // "False" branches or Loop backs should be lighter so they yield to the main spine.
    let weight = 1;
    
    // Safe check for label type before string operations
    const labelContent = edge.label;
    const labelLower = (typeof labelContent === 'string' ? labelContent : '').toLowerCase();
    
    const isFalse = labelLower.includes('false') || labelLower.includes('no');
    const isLoopBack = edge.source === edge.target; 
    
    if (!isFalse && !isLoopBack) {
      weight = 5; // Strong preference for straight main lines
    } else if (isFalse) {
      weight = 1; // False paths can branch out
    }

    dagreGraph.setEdge(edge.source, edge.target, { weight });
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    
    node.targetPosition = direction === 'TB' ? Position.Top : Position.Left;
    node.sourcePosition = direction === 'TB' ? Position.Bottom : Position.Right;

    // We calculate position based on the node's VISUAL width (approx 240-280), 
    // not necessarily the CALC_WIDTH, but since we want center alignment, 
    // we take the center point provided by Dagre.
    
    // NOTE: Dagre gives center x/y by default? No, usually top-left in some configs, 
    // but ReactFlow expects top-left.
    // Dagre's nodeWithPosition.x is the CENTER x.
    
    // We need the actual visual width to center it properly in ReactFlow
    let visualWidth = 240; 
    if (node.type === ApexNodeType.DECISION) visualWidth = 280;
    if (node.type === ApexNodeType.START || node.type === ApexNodeType.END) visualWidth = 140;

    let visualHeight = 80;
    if (node.type === ApexNodeType.DECISION) visualHeight = 200; // Visual height for decision remains 200 for diamond
    if (node.type === ApexNodeType.START || node.type === ApexNodeType.END) visualHeight = 50;

    node.position = {
      x: nodeWithPosition.x - visualWidth / 2,
      y: nodeWithPosition.y - visualHeight / 2,
    };

    return node;
  });

  // Ensure END node is always at the bottom
  const endNode = layoutedNodes.find(node => node.type === ApexNodeType.END);
  if (endNode) {
    // Find the maximum Y position among all non-END nodes
    const maxY = layoutedNodes
      .filter(node => node.type !== ApexNodeType.END)
      .reduce((max, node) => {
        const nodeBottom = node.position.y + (node.type === ApexNodeType.DECISION ? 200 : 80);
        return Math.max(max, nodeBottom);
      }, 0);
    
    // Position END node below all other nodes with spacing
    const spacing = 120; // Same as ranksep
    endNode.position.y = maxY + spacing;
  }

  return { nodes: layoutedNodes, edges };
};