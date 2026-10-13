import type { MappingProfile } from '../types'
import { visualNovelProfile } from './visual-novel'
import { rpgDialogueProfile } from './rpg-dialogue'

export const builtinProfiles: MappingProfile[] = [visualNovelProfile, rpgDialogueProfile]

export { visualNovelProfile, rpgDialogueProfile }
