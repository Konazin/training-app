import { EMPTY_USER_PROFILE, USER_PROFILE_KEY, validateUserProfile, type SettingsRepository, type UserProfileRepository } from '@training/training-domain'

export function createUserProfileRepository(settings: Pick<SettingsRepository, 'get' | 'set'>): UserProfileRepository {
  return {
    async get() {
      const value = await settings.get<unknown>(USER_PROFILE_KEY)
      if (!value || typeof value !== 'object' || Array.isArray(value)) return EMPTY_USER_PROFILE
      return validateUserProfile({ ...EMPTY_USER_PROFILE, ...value })
    },
    async save(profile) {
      const valid = validateUserProfile(profile)
      await settings.set(USER_PROFILE_KEY, valid)
      return valid
    },
  }
}
