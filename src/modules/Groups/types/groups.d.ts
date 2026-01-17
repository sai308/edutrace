export interface Group {
    id?: string | number;
    meetId: string;
    name: string;
}

export interface GroupFormData {
    id?: string | number;
    name: string;
    meetId: string;
    [key: string]: any;
}
