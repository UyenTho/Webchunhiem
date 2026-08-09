export interface ParentInfo {
    fatherName: string;
    fatherJob: string;
    fatherPhone: string;
    motherName: string;
    motherJob: string;
    motherPhone: string;
}

export interface Student {
    id: string;
    code: string;
    fullName: string;
    phone: string;
    hobbies: string;
    favoriteSubjects: string;
    family: ParentInfo;
    paidAmount: number;
    targetAmount: number;
    violations: string[];
}