import type {
  Attendance,
  Course,
  Database,
  Enrollment,
  Expense,
  Grade,
  Payment,
  SchoolClass,
  Student,
  Teacher,
  TimetableEntry,
  AppUser,
  AppNotification,
} from './types'

export const DB_VERSION = 1

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(20262027)
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)]
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min
const round = (n: number, step = 0.5) => Math.round(n / step) * step

const BOY_NAMES = ['Lucas', 'Hugo', 'Adam', 'Yanis', 'Moussa', 'Ibrahim', 'Noah', 'Malick', 'Théo', 'Nathan', 'Karim', 'Samuel', 'Arthur', 'Ousmane', 'Ethan', 'Mathis', 'Léo', 'Amadou', 'Rayan', 'Gabriel', 'Jules', 'Idriss', 'Paul', 'Elias']
const GIRL_NAMES = ['Emma', 'Aïcha', 'Léa', 'Fatou', 'Chloé', 'Inès', 'Mariam', 'Camille', 'Sarah', 'Jade', 'Awa', 'Manon', 'Lina', 'Grace', 'Zoé', 'Nadia', 'Clara', 'Aminata', 'Louise', 'Yasmine', 'Eva', 'Kadiatou', 'Alice', 'Rose']
const LAST_NAMES = ['Diallo', 'Martin', 'Traoré', 'Bernard', 'Koné', 'Dubois', 'Ndiaye', 'Moreau', 'Camara', 'Laurent', 'Sow', 'Lefèvre', 'Bamba', 'Girard', 'Touré', 'Mercier', 'Kouassi', 'Fontaine', 'Mensah', 'Rousseau', 'Diop', 'Blanc', 'Cissé', 'Garnier', 'Ouattara', 'Chevalier', 'Sylla', 'Lambert', 'Keita', 'Faure']
const STREETS = ['Rue des Écoles', 'Avenue de la République', 'Boulevard Lumière', 'Rue Victor Hugo', 'Allée des Tilleuls', 'Rue du Commerce', 'Avenue des Palmiers', 'Rue Pasteur']

const daysAgo = (n: number) => {
  const d = new Date()
  d.setHours(9, 0, 0, 0)
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

const isoDate = (iso: string) => iso.slice(0, 10)

const COURSE_DEFS: Array<Omit<Course, 'id' | 'teacherId'>> = [
  { code: 'MATH', name: 'Mathématiques', coefficient: 4, hoursPerWeek: 5, color: '#1e3a8a' },
  { code: 'FRA', name: 'Français', coefficient: 4, hoursPerWeek: 5, color: '#b45309' },
  { code: 'ANG', name: 'Anglais', coefficient: 2, hoursPerWeek: 3, color: '#0f766e' },
  { code: 'HG', name: 'Histoire-Géographie', coefficient: 2, hoursPerWeek: 3, color: '#7c3aed' },
  { code: 'SVT', name: 'Sciences de la Vie et de la Terre', coefficient: 2, hoursPerWeek: 2, color: '#15803d' },
  { code: 'PC', name: 'Physique-Chimie', coefficient: 3, hoursPerWeek: 3, color: '#be123c' },
  { code: 'ESP', name: 'Espagnol', coefficient: 2, hoursPerWeek: 2, color: '#c2410c' },
  { code: 'INFO', name: 'Informatique', coefficient: 1, hoursPerWeek: 1, color: '#0369a1' },
  { code: 'EPS', name: 'Éducation Physique et Sportive', coefficient: 1, hoursPerWeek: 2, color: '#4d7c0f' },
]

const CLASS_DEFS = [
  ['6ème A', '6ème'], ['6ème B', '6ème'], ['5ème A', '5ème'], ['5ème B', '5ème'],
  ['4ème A', '4ème'], ['4ème B', '4ème'], ['3ème A', '3ème'], ['3ème B', '3ème'],
  ['2nde A', '2nde'], ['2nde C', '2nde'], ['1ère D', '1ère'], ['Terminale D', 'Terminale'],
] as const

export const LEVELS = ['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale']

export const TIME_SLOTS = [
  ['08:00', '09:00'],
  ['09:00', '10:00'],
  ['10:15', '11:15'],
  ['11:15', '12:15'],
  ['14:00', '15:00'],
  ['15:00', '16:00'],
] as const

function schoolYearLabel() {
  const now = new Date()
  const start = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1
  return `${start}-${start + 1}`
}

export function createSeed(): Database {
  const schoolYear = schoolYearLabel()

  const teachers: Teacher[] = []
  const specialties = [...COURSE_DEFS.map((c) => c.name), 'Mathématiques', 'Français', 'Anglais', 'Physique-Chimie', 'Histoire-Géographie']
  specialties.forEach((specialty, i) => {
    const gender = rand() > 0.5 ? 'M' : 'F'
    const firstName = gender === 'M' ? pick(BOY_NAMES) : pick(GIRL_NAMES)
    const lastName = pick(LAST_NAMES)
    teachers.push({
      id: `t${i + 1}`,
      firstName,
      lastName,
      gender,
      email: `${firstName}.${lastName}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') + '@scolaris.edu',
      phone: `+33 6 ${int(10, 99)} ${int(10, 99)} ${int(10, 99)} ${int(10, 99)}`,
      specialty,
      status: i === 12 ? 'congé' : 'actif',
      hiredAt: daysAgo(int(200, 3600)),
      salary: int(28, 46) * 10000,
    })
  })

  const courses: Course[] = COURSE_DEFS.map((c, i) => ({ ...c, id: `c${i + 1}`, teacherId: `t${i + 1}` }))

  const classes: SchoolClass[] = CLASS_DEFS.map(([name, level], i) => ({
    id: `k${i + 1}`,
    name,
    level,
    room: `Salle ${String.fromCharCode(65 + Math.floor(i / 4))}${(i % 4) + 1}0${int(1, 9)}`,
    capacity: 40,
    headTeacherId: teachers[i % teachers.length].id,
  }))

  const students: Student[] = []
  let mat = 1
  classes.forEach((k) => {
    const count = int(13, 17)
    const levelIndex = LEVELS.indexOf(k.level)
    for (let i = 0; i < count; i++) {
      const gender = rand() > 0.48 ? 'M' : 'F'
      const firstName = gender === 'M' ? pick(BOY_NAMES) : pick(GIRL_NAMES)
      const lastName = pick(LAST_NAMES)
      const birthYear = new Date().getFullYear() - 11 - levelIndex - int(0, 1)
      students.push({
        id: `s${mat}`,
        matricule: `SCL-${schoolYear.slice(2, 4)}-${String(mat).padStart(4, '0')}`,
        firstName,
        lastName,
        gender,
        birthDate: `${birthYear}-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`,
        classId: k.id,
        parentName: `${gender === 'M' ? pick(GIRL_NAMES) : pick(BOY_NAMES)} ${lastName}`,
        parentPhone: `+33 6 ${int(10, 99)} ${int(10, 99)} ${int(10, 99)} ${int(10, 99)}`,
        email: `${firstName}.${lastName}${mat}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') + '@eleve.scolaris.edu',
        address: `${int(1, 120)} ${pick(STREETS)}`,
        status: rand() > 0.96 ? 'suspendu' : 'actif',
        enrolledAt: daysAgo(int(30, 900)),
      })
      mat++
    }
  })

  const timetable: TimetableEntry[] = []
  let tt = 1
  classes.forEach((k, ki) => {
    for (let day = 0; day < 5; day++) {
      TIME_SLOTS.forEach(([start, end], si) => {
        if (day === 2 && si >= 4) return
        if ((ki + day + si) % 7 === 6) return
        const course = courses[(ki + day * 3 + si * 2) % courses.length]
        timetable.push({ id: `tt${tt++}`, classId: k.id, courseId: course.id, day, start, end, room: course.code === 'EPS' ? 'Gymnase' : course.code === 'INFO' ? 'Salle info' : k.room })
      })
    }
  })

  const grades: Grade[] = []
  let g = 1
  students.forEach((s) => {
    const ability = 8 + rand() * 9
    courses.forEach((c) => {
      const base = ability + (rand() - 0.5) * 4
      const entries: Array<[Grade['term'], Grade['type'], number]> = [
        ['T1', 'Interrogation', 70],
        ['T1', 'Devoir', 50],
        ['T1', 'Composition', 25],
        ['T2', 'Devoir', 12],
      ]
      entries.forEach(([term, type, ago]) => {
        const value = Math.max(2, Math.min(20, round(base + (rand() - 0.5) * 6)))
        grades.push({ id: `g${g++}`, studentId: s.id, courseId: c.id, term, type, value, date: isoDate(daysAgo(ago + int(0, 4))) })
      })
    })
  })

  const attendance: Attendance[] = []
  let a = 1
  const schoolDays: string[] = []
  for (let i = 1; schoolDays.length < 15; i++) {
    const d = new Date(daysAgo(i))
    if (d.getDay() !== 0 && d.getDay() !== 6) schoolDays.push(isoDate(d.toISOString()))
  }
  students.forEach((s) => {
    schoolDays.forEach((date) => {
      const r = rand()
      const status: Attendance['status'] = r > 0.95 ? 'absent' : r > 0.91 ? 'retard' : r > 0.89 ? 'excusé' : 'présent'
      attendance.push({ id: `a${a++}`, studentId: s.id, classId: s.classId, date, status })
    })
  })

  const tuitionByLevel: Record<string, number> = {
    '6ème': 350000, '5ème': 350000, '4ème': 380000, '3ème': 400000, '2nde': 450000, '1ère': 480000, Terminale: 520000,
  }

  const enrollments: Enrollment[] = []
  const payments: Payment[] = []
  let p = 1
  students.forEach((s, i) => {
    const k = classes.find((c) => c.id === s.classId)!
    const pending = i % 23 === 0
    const enrolledAgo = int(40, 330)
    enrollments.push({
      id: `e${i + 1}`,
      studentId: s.id,
      classId: s.classId,
      schoolYear,
      date: isoDate(daysAgo(enrolledAgo)),
      type: rand() > 0.3 ? 'Réinscription' : 'Nouvelle',
      status: pending ? 'en attente' : 'validée',
      fee: 50000,
    })
    if (!pending) {
      payments.push({ id: `p${p}`, reference: `PAY-${String(p).padStart(5, '0')}`, studentId: s.id, category: 'Inscription', amount: 50000, method: pick(['Espèces', 'Mobile Money', 'Virement'] as const), date: isoDate(daysAgo(enrolledAgo)), status: 'payé' })
      p++
    }
    const tuition = tuitionByLevel[k.level]
    const installments = pending ? 0 : int(1, 3)
    for (let n = 0; n < installments; n++) {
      payments.push({
        id: `p${p}`,
        reference: `PAY-${String(p).padStart(5, '0')}`,
        studentId: s.id,
        category: 'Scolarité',
        amount: Math.round(tuition / 3 / 1000) * 1000,
        method: pick(['Espèces', 'Mobile Money', 'Virement', 'Chèque'] as const),
        date: isoDate(daysAgo(int(1, 340))),
        status: rand() > 0.94 ? 'en attente' : 'payé',
      })
      p++
    }
    if (rand() > 0.55) {
      payments.push({ id: `p${p}`, reference: `PAY-${String(p).padStart(5, '0')}`, studentId: s.id, category: pick(['Cantine', 'Transport', 'Tenue'] as const), amount: pick([15000, 25000, 30000, 45000]), method: pick(['Espèces', 'Mobile Money'] as const), date: isoDate(daysAgo(int(1, 300))), status: 'payé' })
      p++
    }
  })

  const expenses: Expense[] = []
  let x = 1
  for (let m = 0; m < 12; m++) {
    const ago = m * 30 + 3
    expenses.push({ id: `x${x++}`, label: `Salaires du personnel — mois ${12 - m}`, category: 'Salaires', amount: int(380, 460) * 10000, date: isoDate(daysAgo(ago)), supplier: 'Personnel', method: 'Virement', status: m === 0 ? 'en attente' : 'payée' })
    expenses.push({ id: `x${x++}`, label: 'Facture électricité & eau', category: 'Électricité & Eau', amount: int(18, 32) * 10000, date: isoDate(daysAgo(ago + 8)), supplier: 'Énergie Services', method: 'Virement', status: 'payée' })
    const extras = [
      ['Achat de fournitures scolaires', 'Fournitures', 'Librairie Centrale'],
      ['Réparation climatisation', 'Maintenance', 'FroidTech'],
      ['Carburant bus scolaire', 'Transport', 'Station Total'],
      ['Organisation journée culturelle', 'Événements', 'Comité des fêtes'],
      ['Matériel informatique', 'Fournitures', 'InfoPlus'],
      ['Entretien des locaux', 'Maintenance', 'NetPro Services'],
      ['Frais bancaires', 'Autres', 'Banque Atlantique'],
    ] as const
    for (let e = 0; e < int(1, 3); e++) {
      const [label, category, supplier] = pick(extras)
      expenses.push({ id: `x${x++}`, label, category, amount: int(5, 60) * 5000, date: isoDate(daysAgo(ago + int(1, 25))), supplier, method: pick(['Espèces', 'Virement', 'Chèque'] as const), status: 'payée' })
    }
  }

  const users: AppUser[] = [
    { id: 'u1', name: 'Claire Fontaine', email: 'admin@scolaris.edu', password: 'admin123', role: 'admin', status: 'actif', lastLogin: daysAgo(0) },
    { id: 'u2', name: 'Bernard Traoré', email: 'directeur@scolaris.edu', password: 'directeur123', role: 'directeur', status: 'actif', lastLogin: daysAgo(1) },
    { id: 'u3', name: `${teachers[0].firstName} ${teachers[0].lastName}`, email: 'enseignant@scolaris.edu', password: 'enseignant123', role: 'enseignant', status: 'actif', lastLogin: daysAgo(2), teacherId: teachers[0].id },
    { id: 'u4', name: 'Sophie Mensah', email: 'comptable@scolaris.edu', password: 'comptable123', role: 'comptable', status: 'actif', lastLogin: daysAgo(1) },
    { id: 'u5', name: 'Aminata Sow', email: 'secretaire@scolaris.edu', password: 'secretaire123', role: 'secretaire', status: 'actif', lastLogin: daysAgo(3) },
  ]

  const notifications: AppNotification[] = [
    { id: 'n1', title: 'Paiement reçu', message: `${students[3].firstName} ${students[3].lastName} a réglé une tranche de scolarité.`, type: 'paiement', createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(), read: false },
    { id: 'n2', title: 'Nouvelle inscription', message: `Dossier d'inscription en attente pour ${students[0].firstName} ${students[0].lastName}.`, type: 'inscription', createdAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(), read: false },
    { id: 'n3', title: 'Absence signalée', message: `${students[17].firstName} ${students[17].lastName} est absent(e) ce matin.`, type: 'absence', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), read: true },
    { id: 'n4', title: 'Notes publiées', message: 'Les notes de composition du 1er trimestre sont disponibles.', type: 'note', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(), read: true },
  ]

  return {
    version: DB_VERSION,
    students,
    teachers,
    classes,
    courses,
    timetable,
    grades,
    attendance,
    enrollments,
    payments,
    expenses,
    users,
    notifications,
    session: null,
    settings: { schoolName: 'Lycée International Scolaris', schoolYear, currency: 'FCFA', tuitionByLevel },
  }
}
