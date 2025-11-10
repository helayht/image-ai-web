<script setup>
import { reactive, ref } from 'vue'

const props = defineProps({
  error: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['login'])

const formState = reactive({
  username: '',
  password: '',
})

const localError = ref('')

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
</script>

<template>
  <div class="auth-screen">
    <div class="auth-card">
      <header class="auth-header">
        <span class="auth-logo">AI</span>
        <h1>Image Studio</h1>
        <p>登录后体验多模型图像创作</p>
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
        <button type="submit" class="auth-submit">登录</button>
      </form>
    </div>
  </div>
</template>
