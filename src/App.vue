<script setup>
import { ref } from 'vue'
import LoginPanel from './components/auth/LoginPanel.vue'
import MainWorkspace from './components/layout/MainWorkspace.vue'

const USERNAME = 'admin'
const PASSWORD = 'admin'

const currentUser = ref(null)
const authError = ref('')

const handleLogin = ({ username, password }) => {
  authError.value = ''
  if (username === USERNAME && password === PASSWORD) {
    currentUser.value = { username }
    return
  }
  authError.value = '账号或密码不正确'
}

const handleLogout = () => {
  currentUser.value = null
}
</script>

<template>
  <div class="app-wrapper" :class="{ 'has-workspace': currentUser }">
    <LoginPanel v-if="!currentUser" :error="authError" @login="handleLogin" />
    <MainWorkspace
      v-else
      :user="currentUser"
      @logout="handleLogout"
    />
  </div>
</template>
