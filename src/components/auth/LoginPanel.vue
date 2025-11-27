<script setup>
import { reactive, ref } from 'vue'

const props = defineProps({
  error: {
    type: String,
    default: '',
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['login', 'register'])

const formState = reactive({
  username: '',
  password: '',
})

const localError = ref('')
const showRegisterModal = ref(false)
const registerForm = reactive({
  username: '',
  password: '',
})
const registerError = ref('')

const handleSubmit = () => {
  localError.value = ''
  if (!formState.username.trim() || !formState.password.trim()) {
    localError.value = '请输入账号和密码'
    return
  }
  emit('login', {
    username: formState.username.trim(),
    password: formState.password.trim(),
  })
}

const openRegister = () => {
  registerForm.username = formState.username
  registerForm.password = formState.password
  registerError.value = ''
  showRegisterModal.value = true
}

const closeRegister = () => {
  showRegisterModal.value = false
  registerError.value = ''
}

const handleRegisterSubmit = () => {
  registerError.value = ''
  if (!registerForm.username.trim() || !registerForm.password.trim()) {
    registerError.value = '请输入账号和密码'
    return
  }
  emit('register', {
    username: registerForm.username.trim(),
    password: registerForm.password.trim(),
  })
}
</script>

<template>
  <div class="auth-screen">
    <div class="auth-card">
      <header class="auth-header">
        <div class="auth-badge-row">
          <span class="auth-pill">多模型·图生图</span>
          <span class="auth-pill subtle">快速生成</span>
        </div>
        <span class="auth-logo">AI</span>
        <h1>Image Studio</h1>
        <p>登录后体验文生图与图生图全流程</p>
      </header>

      <form class="auth-form" @submit.prevent="handleSubmit">
        <label class="auth-field">
          <span>账号</span>
          <input
            v-model="formState.username"
            type="text"
            autocomplete="username"
            placeholder="请输入账号"
          />
        </label>
        <label class="auth-field">
          <span>密码</span>
          <input
            v-model="formState.password"
            type="password"
            autocomplete="current-password"
            placeholder="请输入密码"
          />
        </label>
        <p v-if="localError" class="auth-error">{{ localError }}</p>
        <p v-else-if="props.error" class="auth-error">{{ props.error }}</p>
        <div class="auth-actions">
          <button type="submit" class="auth-submit" :disabled="props.loading">
            {{ props.loading ? '登录中…' : '登录' }}
          </button>
          <button
            type="button"
            class="auth-ghost"
            :disabled="props.loading"
            @click="openRegister"
          >
            {{ props.loading ? '请稍候…' : '注册' }}
          </button>
        </div>
      </form>

      <div v-if="showRegisterModal" class="auth-modal-overlay" @click.self="closeRegister">
        <div class="auth-modal">
          <header class="auth-modal-header">
            <div>
              <p class="modal-eyebrow">新用户注册</p>
              <h2>快速创建账号</h2>
            </div>
            <button type="button" class="modal-close" @click="closeRegister">×</button>
          </header>
          <form class="auth-form" @submit.prevent="handleRegisterSubmit">
            <label class="auth-field">
              <span>账号</span>
              <input
                v-model="registerForm.username"
                type="text"
                autocomplete="username"
                placeholder="设置登录账号"
              />
            </label>
            <label class="auth-field">
              <span>密码</span>
              <input
                v-model="registerForm.password"
                type="password"
                autocomplete="new-password"
                placeholder="设置登录密码"
              />
            </label>
            <p v-if="registerError" class="auth-error">{{ registerError }}</p>
            <p v-else-if="props.error" class="auth-error">{{ props.error }}</p>
            <div class="auth-actions">
              <button type="submit" class="auth-submit" :disabled="props.loading">
                {{ props.loading ? '注册中…' : '确认注册' }}
              </button>
              <button type="button" class="auth-ghost" :disabled="props.loading" @click="closeRegister">
                取消
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
