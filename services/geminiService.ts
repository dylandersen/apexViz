import { GoogleGenAI, Type } from "@google/genai";
import { ApexParseResult, ApexNodeType } from '../types';

export const parseApexCode = async (code: string): Promise<ApexParseResult> => {
  // Initialize AI client just before use
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = "gemini-2.5-flash"; 
  
  const systemInstruction = `
    You are an expert Salesforce Apex compiler and visualizer. 
    Your task is to analyze Apex code and convert it into a strict, linear flow chart structure resembling Salesforce Flow Builder.
    
    CRITICAL VISUALIZATION RULES:
    1. **Linear Spine**: The flow MUST be top-to-bottom. Avoid chaotic cross-linking.
    2. **Merge Branches**: When an 'If' statement ends, the 'True' and 'False' paths MUST merge back to a common next step (unless one path returns/exits). Do NOT leave dangling nodes.
    3. **End Node**: The 'End' node must be the FINAL destination of the chart. Do not place it in the middle.
    4. **Loop Structure**: Treat loops as a cycle. 
       - Node 1: Loop Decision ("Has Items?")
       - Path Yes -> Process Item -> ... -> Go back to Loop Decision.
       - Path No -> Next Step (Outside Loop).
    
    Node Identification Rules:
    1. **SOQL Nodes ('soql')**:
       - Look for [SELECT ...] syntax or Database.query().
       - Label: "Get [Object]" (e.g., "Get Contacts").
       - Detail: The query snippet.
    
    2. **DML Nodes ('dml')**:
       - Look for 'insert', 'update', 'delete', 'upsert'.
       - Label: "[Operation] [Object]" (e.g., "Update Opportunity", "Create Tasks").
       - Detail: The variable being operated on.

    3. **Decision Nodes ('decision')**:
       - If/Else, Switch.
       - Label: The condition (e.g., "Stage is Closed Won?").
       - Edges: MUST label branches "True" and "False".

    4. **Loop Nodes ('loop')**:
       - Label: "Iterate [List Name]" or "For Each [Object]".

    5. **Action Nodes ('action')**:
       - Assignments, calculations, list operations.
       - Label: Concise action (e.g., "Add to List", "Set Status").
    
    6. **Start/End**:
       - Start: Trigger/Method Name.
       - End: "End Process".

    Line Number:
    - For EVERY node, provide the 'line' number in the original code where this logic block begins. This is crucial for highlighting.

    JSON Structure:
    - Return a flat list of nodes and edges.
    - Ensure every node is connected.
    - Warnings: Identify potential Governor Limit issues (SOQL/DML inside loops).
  `;

  const response = await ai.models.generateContent({
    model,
    contents: `Analyze this Apex code and generate the flow chart JSON:\n\n${code}`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          nodes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                type: { type: Type.STRING, enum: Object.values(ApexNodeType) },
                label: { type: Type.STRING },
                details: { type: Type.STRING },
                line: { type: Type.INTEGER }
              },
              required: ['id', 'type', 'label']
            }
          },
          edges: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                source: { type: Type.STRING },
                target: { type: Type.STRING },
                label: { type: Type.STRING },
                animated: { type: Type.BOOLEAN }
              },
              required: ['id', 'source', 'target']
            }
          },
          warnings: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ['limit', 'best-practice', 'security'] },
                message: { type: Type.STRING },
                line: { type: Type.INTEGER }
              },
              required: ['type', 'message']
            }
          }
        },
        required: ['nodes', 'edges', 'warnings']
      }
    }
  });

  if (response.text) {
    try {
        const result = JSON.parse(response.text) as ApexParseResult;
        return result;
    } catch (e) {
        throw new Error("Failed to parse AI response as JSON");
    }
  }
  
  throw new Error("Failed to generate analysis");
};