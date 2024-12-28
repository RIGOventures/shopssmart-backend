import { describe, expect, expectTypeOf, test } from 'vitest'
import { render, screen } from '@testing-library/react'

import { Preferences } from '@/lib/types'

import Page from '../page'

import { getProfileForUser } from '@/app/actions';
import { getPreferences, updatePreferences } from '@/app/account/actions';

import allergyTypes from '@/lib/registry/allergies'
import dietPlanTypes from '@/lib/registry/dietPlans'

const testUserEmail = 'admin@admin.com'

test('Page', async () => {
	// ! Vitest currently does not support them async Client components
    /*
	render(<Page />)
    expect(screen.getByRole('heading', { level: 1, name: 'Home' })).toBeDefined()
	*/
})

test('Preferences: Get', async () => {
	const profileId = (await getProfileForUser(testUserEmail))

	// Get preferences on that profile
	const preferences : Preferences = await getPreferences(profileId) || {}
	console.log(preferences)
})

test('Preferences: Set', async () => {
	const profileId = (await getProfileForUser(testUserEmail))
    console.log(profileId)

	const formData = new FormData();
	formData.append("lifestyle", dietPlanTypes[1])
    formData.append("allergen", allergyTypes[1])
    formData.append("health", "Nothing")

	updatePreferences(profileId, undefined, formData)
})