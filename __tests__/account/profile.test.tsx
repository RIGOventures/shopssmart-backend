import { describe, expect, expectTypeOf, test } from 'vitest'
import { render, screen } from '@testing-library/react'

import { Profile } from '@/lib/types'
import { ResultCode } from '@/lib/utils/result'

import Page from '../page'

import { createProfile, getProfile, deleteProfile, getProfiles, setProfileForUser, getProfileForUser } from '@/app/actions';

const testUserEmail = 'admin@admin.com'
const testUserPassword = 'password'

test('Page', async () => {
	// ! Vitest currently does not support them async Client components
    /*
	render(<Page />)
    expect(screen.getByRole('heading', { level: 1, name: 'Home' })).toBeDefined()
	*/
})

describe('createProfile', async () => {
    const Profile: Profile = {
        id: ProfileId,
        title,
        userId,
        createdAt,
        messages: ProfileMessages,
        path
    };

    await createProfile(Profile);
})

describe('getProfile', async () => {
    let id = session.user!.id ?? '';
    const Profile = await getProfile(params.id, id)
})

describe('deleteProfile', async () => {
    const result = await deleteProfile({
        id: Profile.id,
        path: Profile.path
    })
})

describe('getProfiles', async () => {
    const Profiles = await getProfiles(userId)
})

describe('clearProfiles', async () => {
    const result = await clearProfiles()
})

describe('getProfileForUser', () => {
    test('profile exists', async () => {
        const profileId = (await getProfileForUser(testUserEmail))
        console.log(profileId)
        expectTypeOf(profileId).toBeString()
    })
  
    test('user does not exist', async () => {
        try {
            (await getProfileForUser(""))
        } catch (error: Error) {
            expect(error.message).toBe('Failed to fetch user.')
        }
    })
})


describe('setProfileForUser', () => {
    test('profile exists', async () => {
        const profileId = (await setProfileForUser(testUserEmail))
        console.log(profileId)
        expectTypeOf(profileId).toBeString()
    })
  
    test('user does not exist', async () => {
        try {
            (await setProfileForUser(""))
        } catch (error: Error) {
            expect(error.message).toBe('Failed to fetch user.')
        }
    })
})