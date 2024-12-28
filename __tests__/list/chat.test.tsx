import { describe, expect, expectTypeOf, test } from 'vitest'
import { render, screen } from '@testing-library/react'

import { Chat } from '@/lib/types'
import { ResultCode } from '@/lib/utils/result'

import Page from '../page'

import { saveChat, getChat, removeChat, shareChat, getSharedChat, getChats, clearChats } from '@/app/actions';

const testUserEmail = 'admin@admin.com'
const testUserPassword = 'password'

test('Page', async () => {
	// ! Vitest currently does not support them async Client components
    /*
	render(<Page />)
    expect(screen.getByRole('heading', { level: 1, name: 'Home' })).toBeDefined()
	*/
})

describe('saveChat', async () => {
    const chat: Chat = {
        id: chatId,
        title,
        userId,
        createdAt,
        messages: chatMessages,
        path
    };

    await saveChat(chat);
})

describe('getChat', async () => {
    let id = session.user!.id ?? '';
    const chat = await getChat(params.id, id)
})

describe('removeChat', async () => {
    const result = await removeChat({
        id: chat.id,
        path: chat.path
    })
})

describe('shareChat', async () => {
    const result = await shareChat(chat.id)
    // result.sharePath
    // `/share/${chat.id}`
})

describe('getSharedChat', async () => {
    const result = await getSharedChat(chat.id)
    // result.sharePath
    // `/share/${chat.id}`
})

describe('getChats', async () => {
    const chats = await loadChats(userId)
})

describe('clearChats', async () => {
    const result = await clearChats()
})