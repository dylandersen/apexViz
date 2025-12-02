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
    // 1. Collect Opportunity IDs that moved to Stage 4
    Set<Id> stage4OppIds = new Set<Id>();
    
    for (Opportunity opp : Trigger.new) {
        Opportunity oldOpp = Trigger.oldMap.get(opp.Id);
        if (opp.StageName == 'Stage 4' && oldOpp.StageName != 'Stage 4') {
            stage4OppIds.add(opp.Id);
        }
    }
    
    // Exit early if no opportunities moved to Stage 4
    if (stage4OppIds.isEmpty()) {
        return;
    }
    
    // 2. Query ALL primary contact roles in ONE query (outside the loop)
    Map<Id, OpportunityContactRole> oppIdToContactRole = new Map<Id, OpportunityContactRole>();
    
    for (OpportunityContactRole ocr : [
        SELECT ContactId, Contact.Name, OpportunityId
        FROM OpportunityContactRole
        WHERE OpportunityId IN :stage4OppIds
        AND IsPrimary = true
    ]) {
        oppIdToContactRole.put(ocr.OpportunityId, ocr);
    }
    
    // 3. Build tasks using the map
    List<Task> tasksToCreate = new List<Task>();
    
    for (Opportunity opp : Trigger.new) {
        if (stage4OppIds.contains(opp.Id) && oppIdToContactRole.containsKey(opp.Id)) {
            OpportunityContactRole primaryContact = oppIdToContactRole.get(opp.Id);
            
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
            tasksToCreate.add(newTask);
        }
    }
    
    // 4. Bulk insert
    if (!tasksToCreate.isEmpty()) {
        insert tasksToCreate;
    }
}`;