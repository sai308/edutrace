interface Keywords {
    [key: string]: string[]
}

export const MEET_REPORT_KEYWORDS: Keywords = {
    name: ['full name', 'participant', "ім'я"],
    duration: ['time in call', 'duration', 'тривалість'],
    email: ['email', 'електронна пошта'],
    joinTime: ['first seen', 'join time', 'joined', 'час', 'приєднан'],
}

export const MARKS_CSV_REQUIRED_HEADERS = ['Прізвище', 'surname', 'last name']

export const MARKS_CSV_KEYWORDS: Keywords = {
    maxPoints: ['Max Points', 'Максимальна кількість балів'],
}
