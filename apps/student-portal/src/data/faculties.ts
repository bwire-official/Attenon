// University Faculties and Departments Data

export interface Department {
    name: string;
}

export interface Faculty {
    name: string;
    departments: Department[];
}

export const faculties: Faculty[] = [
    {
        name: 'Faculty of Allied Health Sciences',
        departments: [
            { name: 'B.Sc. Public Health' },
            { name: 'B.N.Sc. Nursing Science' },
            { name: 'B.Rad. Radiography' },
            { name: 'B.MLS. Medical Laboratory Science' },
            { name: 'DPT. Physiotherapy' },
            { name: 'B.Sc. Human Nutrition and Dietetics' },
            { name: 'B.Sc. Information Technology and Health Informatics' },
        ],
    },
    {
        name: 'Faculty of Computing',
        departments: [
            { name: 'B.Sc. Computer Science' },
            { name: 'B.Sc. Software Engineering' },
            { name: 'B.Sc. Cybersecurity' },
            { name: 'B.Sc. Data Science and Artificial Intelligence' },
            { name: 'B.Sc. Information Technology' },
        ],
    },
    {
        name: 'Faculty of Environmental Sciences',
        departments: [
            { name: 'B.Sc. Architecture' },
            { name: 'B.Sc. Estate Management' },
            { name: 'B.Sc. Urban and Regional Planning' },
            { name: 'B.Sc. Quantity Surveying' },
            { name: 'B.Sc. Building Technology' },
            { name: 'B.Sc. Geography and Environmental Management' },
        ],
    },
    {
        name: 'Faculty of Natural & Applied Sciences',
        departments: [
            { name: 'Physics (B.Sc.)' },
            { name: 'Mathematics (B.Sc.)' },
            { name: 'Chemistry (B.Sc.)' },
            { name: 'Biological Sciences (B.Sc.)' },
            { name: 'Micro Biology (B.Sc.)' },
            { name: 'Industrial Chemistry (B.Sc.)' },
            { name: 'Biochemistry (B.Sc.)' },
            { name: 'B.Sc. Animal and Environmental Biology' },
            { name: 'B.Sc. Botany and Biotechnology' },
            { name: 'B.Sc. Medical Physics' },
            { name: 'B.Sc. Applied Geophysics' },
            { name: 'B.Sc. Physics with Electronics' },
        ],
    },
    {
        name: 'Faculty of Social and Management Sciences',
        departments: [
            { name: 'Accounting (B.Sc.)' },
            { name: 'Banking and Finance (B.Sc.)' },
            { name: 'Economics (B.Sc.)' },
            { name: 'Industrial Relations and Personnel Management (B.Sc.)' },
            { name: 'Mass Communication (B.Sc.)' },
            { name: 'Political Science and Public Administration (B.Sc.)' },
            { name: 'Sociology (B.Sc.)' },
            { name: 'Management (B.Sc.)' },
        ],
    },
    {
        name: 'Faculty of Humanities',
        departments: [
            { name: 'History and International Studies' },
            { name: 'Language and Literary Studies' },
            { name: 'B.A. Theatre Arts' },
            { name: 'B.A. Fine and Applied Arts' },
        ],
    },
];

// Helper function to get all departments for a specific faculty
export function getDepartmentsByFaculty(facultyName: string): Department[] {
    const faculty = faculties.find(f => f.name === facultyName);
    return faculty ? faculty.departments : [];
}

// Helper function to get all faculty names
export function getAllFacultyNames(): string[] {
    return faculties.map(f => f.name);
}

// Helper function to get all departments (flattened)
export function getAllDepartments(): Department[] {
    return faculties.flatMap(f => f.departments);
}
