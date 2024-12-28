import { describe, expect, expectTypeOf, test } from 'vitest'
import { render, screen } from '@testing-library/react'

import { User } from '@/lib/types'

import Page from '../page'

import { getUser, authenticate, deauthenticate } from '@/app/login/actions';

const testUserEmail = 'admin@admin.com'
const testUserPassword = 'password'

test('Page', async () => {
	// ! Vitest currently does not support them async Client components
    /*
	render(<Page />)
    expect(screen.getByRole('heading', { level: 1, name: 'Home' })).toBeDefined()
	*/
})

describe('getUser', () => {
    test('user exists', async () => {
        const user = (await getUser(testUserEmail))
        console.log(user)
        expect(user).toBeTruthy()
        expectTypeOf(user?.email).toBeString()
    })
  
    test('user does not exist', async () => {
        try {
            (await getUser(""))
        } catch (error: Error) {
            expect(error.message).toBe('Failed to fetch user.')
        }
    })
})

describe('authenticate', () => {
    test('valid details', async () => {
        const formData = new FormData();
        formData.append("email", testUserEmail)
        formData.append("password", testUserPassword)
    
        const result = await authenticate(undefined, formData)
        console.log(result)
        //expect(result.type).toBe('success')
    })

    test('invalid email', async () => {
        const formData = new FormData();
        formData.append("email", 123)
        formData.append("password", testUserPassword)
    
        const result = await authenticate(undefined, formData)
        expect(result.type).toBe('error')
    })

    test('invalid password', async () => {
        const formData = new FormData();
        formData.append("email", testUserEmail)
        formData.append("password", "")
    
        const result = await authenticate(undefined, formData)
        expect(result.type).toBe('error')
    })

})

test('deauthenticate', async () => {
	//await deauthenticate()
})