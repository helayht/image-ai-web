<script setup>
import { ref } from 'vue'
import LoginPanel from './components/auth/LoginPanel.vue'
import MainWorkspace from './components/layout/MainWorkspace.vue'

const API_ROOT = 'http://localhost:8080/image/ai/api'

const currentUser = ref(null)
const authError = ref('')
const isSubmitting = ref(false)

const handleLogin = async ({ username, password }) => {
  authError.value = ''
  const trimmedUsername = username?.trim()
  const trimmedPassword = password?.trim()
  if (!trimmedUsername || !trimmedPassword) {
    authError.value = '请输入账号和密码'
    return
  }

  isSubmitting.value = true
  try {
    const response = await fetch(`${API_ROOT}/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: trimmedUsername, password: trimmedPassword }),
    })
    const payload = await response.json()
    if (payload.code === '200' && payload.data === true) {
      currentUser.value = { username: trimmedUsername }
      return
    }
    authError.value = payload.info || '账号或密码不正确'
  } catch (error) {
    authError.value = '登录失败，请稍后重试'
  }
  isSubmitting.value = false
}

const handleLogout = () => {
  currentUser.value = null
}

const handleRegister = async ({ username, password }) => {
  authError.value = ''
  const trimmedUsername = username?.trim()
  const trimmedPassword = password?.trim()
  if (!trimmedUsername || !trimmedPassword) {
    authError.value = '请输入账号和密码'
    return
  }
  isSubmitting.value = true
  try {
    const response = await fetch(`${API_ROOT}/user/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: trimmedUsername, password: trimmedPassword }),
    })
    const payload = await response.json()
    if (payload.code === '200' && payload.data === true) {
      await handleLogin({ username: trimmedUsername, password: trimmedPassword })
      return
    }
    authError.value = payload.info || '注册失败，请稍后再试'
  } catch (error) {
    authError.value = '注册失败，请稍后再试'
  }
  isSubmitting.value = false
}
</script>

<template>
  <div class="app-wrapper" :class="{ 'has-workspace': currentUser }">
    <LoginPanel
      v-if="!currentUser"
      :error="authError"
      :loading="isSubmitting"
      @login="handleLogin"
      @register="handleRegister"
    />
    <MainWorkspace
      v-else
      :user="currentUser"
      @logout="handleLogout"
    />
  </div>
</template>
