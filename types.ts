import { Edge, Node } from 'reactflow';

export enum ApexNodeType {
  START = 'start',
  END = 'end',
  DECISION = 'decision',
  ACTION = 'action', // General action
  SOQL = 'soql',     // Specific blue
  DML = 'dml',       // Specific blue
  LOOP = 'loop',     // Orange
  SUBFLOW = 'subflow', // Purple
  ERROR = 'error'
}

export interface AnalysisWarning {
  type: 'limit' | 'best-practice' | 'security';
  message: string;
  line?: number;
}

export interface ApexParseResult {
  nodes: {
    id: string;
    type: ApexNodeType;
    label: string;
    details?: string; // Code snippet or detailed description
    line?: number; // Line number in source code
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    label?: string; // For decision branches (True/False)
    animated?: boolean;
  }[];
  warnings: AnalysisWarning[];
}

export interface FlowState {
  nodes: Node[];
  edges: Edge[];
}

// Sample code for the initial state
export const SAMPLE_APEX_CODE = `trigger OpportunityStage4Task on Opportunity (after update) {
    // Initialize a list to hold all tasks that will be created
    List<Task> tasksToCreate = new List<Task>();
    
    // Loop through each updated opportunity record
    for (Opportunity opp : Trigger.new) {
        // Get the old version of the opportunity to compare values
        Opportunity oldOpp = Trigger.oldMap.get(opp.Id);
        
        // Check if the opportunity stage has moved to 'Stage 4'
        // Only proceed if it wasn't already in Stage 4
        if (opp.StageName == 'Stage 4' && oldOpp.StageName != 'Stage 4') {
            
            // Query for the primary contact role associated with this opportunity
            List<OpportunityContactRole> contactRoles = [
                SELECT ContactId, Contact.Name 
                FROM OpportunityContactRole 
                WHERE OpportunityId = :opp.Id 
                AND IsPrimary = true
                LIMIT 1
            ];
            
            // Check if a primary contact was found
            if (!contactRoles.isEmpty()) {
                OpportunityContactRole primaryContact = contactRoles[0];
                
                // Create a new task for the sales rep
                Task newTask = new Task(
                    Subject = 'Call ' + primaryContact.Contact.Name,
                    Description = 'Follow up on ' + opp.Name + ' - Call main contact ' + primaryContact.Contact.Name,
                    WhoId = primaryContact.ContactId,
                    WhatId = opp.Id,
                    OwnerId = opp.OwnerId,
                    Status = 'Open',
                    Priority = 'High',
                    ActivityDate = Date.today().addDays(1)
                );
                
                // Add the task to the list for bulk creation
                tasksToCreate.add(newTask);
            }
        }
    }
    
    // Insert all tasks at once if any were created
    if (!tasksToCreate.isEmpty()) {
        insert tasksToCreate;
    }
}`;