
// Helper for the idb library
import { DBSchema } from 'idb';
import {
    Meet,
    Group,
    Task,
    Mark,
    Member,
    Module,
    FinalAssessment
} from './models';

export interface IDBCustomSchema extends DBSchema {
    meets: {
        key: string;
        value: Meet;
        indexes: { meetId: string; date: string };
    };
    settings: {
        key: string;
        value: any;
    };
    groups: {
        key: number;
        value: Group;
        indexes: { meetId: string; name: string };
    };
    tasks: {
        key: number;
        value: Task;
        indexes: { groupId: string; name_date_group: [string, string, string]; groupName: string };
    };
    marks: {
        key: number;
        value: Mark;
        indexes: { taskId: string; studentId: string; task_student: [string, string]; createdAt: string; groupName: string };
    };
    members: {
        key: string;
        value: Member;
        indexes: { name: string; groupName: string; role: string };
    };
    modules: {
        key: number;
        value: Module;
        indexes: { groupId: string; groupName: string };
    };
    finalAssessments: {
        key: number;
        value: FinalAssessment;
        indexes: { studentId: string; assessmentType: string; student_type: [string, string] };
    };
    // Legacy
    students: { key: any; value: any };
}
