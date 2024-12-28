import { describe, expect, expectTypeOf, test } from 'vitest'
import { render, screen } from '@testing-library/react'

import { User } from '@/lib/types'
import { ResultCode } from '@/lib/utils/result'

import Page from '../page'

import { createUser, signup } from '@/app/signup/actions';

const testUserEmail = 'admin@admin.com'
const testUserPassword = 'password'

test('Page', async () => {
	// ! Vitest currently does not support them async Client components
    /*
	render(<Page />)
    expect(screen.getByRole('heading', { level: 1, name: 'Home' })).toBeDefined()
	*/
})

describe('createUser', () => {
    test('user exists', async () => {
        const result = (await createUser(testUserEmail, testUserPassword))
        expect(result.resultCode).toBe(ResultCode.UserAlreadyExists)
    })
  
    test('user does not exist', async () => {
        const result = (await createUser(testUserEmail, testUserPassword))
        expect(result.resultCode).toBe(ResultCode.UserCreated)
    })
})

describe('signup', () => {
    test('valid details', async () => {
        const formData = new FormData();
        formData.append("email", testUserEmail)
        formData.append("password", testUserPassword)
    
        const result = await signup(undefined, formData)
        expect(result.resultCode).toBe(ResultCode.UserCreated)
    })

    test('invalid email', async () => {
        const formData = new FormData();
        formData.append("email", 123)
        formData.append("password", testUserPassword)
    
        const result = await signup(undefined, formData)
        expect(result.type).toBe('error')
    })

    test('invalid password', async () => {
        const formData = new FormData();
        formData.append("email", testUserEmail)
        formData.append("password", "")
    
        const result = await signup(undefined, formData)
        expect(result.type).toBe('error')
    })

})
