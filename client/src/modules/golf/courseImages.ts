// Manual registry of course images. To add a new course:
//   1. Drop an image at `client/public/golf/courses/<slug>.jpg` (or .webp)
//      — or reuse an existing path from another module
//   2. Add an entry below with the slug, the image path, and any name aliases
//      a user might type when logging a round.

export interface CourseImage {
  name: string
  image: string
  objectPosition?: string
  aliases?: string[]
}

const COURSES: CourseImage[] = [
  {
    name: 'South Creek',
    image: '/golf/courses/south_creek.webp',
    aliases: ['South Creek Golf Club'],
  },
  {
    name: 'Glen Dornoch',
    image: '/golf/courses/glen_donorch.jpg',
    objectPosition: '50% 40%',
    aliases: ['Glen Dornoch Waterway Golf Links'],
  },
  {
    name: "Man O' War",
    image: '/golf/courses/man_o_war.webp',
    aliases: ['Man O War', 'Man Of War'],
  },
  {
    name: 'Bergen Point',
    image: '/golf/courses/bergen_point.jpg',
    aliases: ['Bergen Point Golf Course'],
  },
  {
    name: 'Crab Meadow',
    image: '/golf/courses/crab_meadow.jpg',
    aliases: ['Crab Meadow Golf Course'],
  },
  {
    name: 'Middle Bay',
    image: '/golf/courses/middle_bay.jpeg',
    aliases: ['Middle Bay Country Club'],
  },
  {
    name: 'Town of Oyster Bay',
    image: '/golf/courses/town_of_oyster_bay.jpeg',
    aliases: ['TOBAY', 'TOBAY Golf Course', 'Oyster Bay'],
  },
  {
    name: 'Lido Beach',
    image: '/golf/courses/lido_beach.jpg',
    aliases: ['Lido Golf Club', 'Lido'],
  },
  {
    name: 'Sunken Meadow',
    image: '/golf/courses/sunken_meadow.webp',
    aliases: ['Sunken Meadow State Park', 'Sunken Meadow Golf Course'],
  },
]

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function allNames(course: CourseImage): string[] {
  return [course.name, ...(course.aliases ?? [])]
}

export function getCourseImage(courseName: string): CourseImage | null {
  const target = normalize(courseName)
  if (!target) return null
  for (const course of COURSES) {
    for (const alias of allNames(course)) {
      const n = normalize(alias)
      if (n === target || target.includes(n) || n.includes(target)) {
        return course
      }
    }
  }
  return null
}

export function getCourseSuggestions(query: string, limit = 6): CourseImage[] {
  const q = normalize(query)
  if (!q) return []
  const matches: CourseImage[] = []
  for (const course of COURSES) {
    const hit = allNames(course).some((a) => normalize(a).includes(q))
    if (hit) matches.push(course)
    if (matches.length >= limit) break
  }
  return matches
}
