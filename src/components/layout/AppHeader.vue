<script setup>
const props = defineProps({
  user: {
    type: Object,
    required: true,
  },
  hasPendingTasks: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['logout'])
</script>

<template>
  <header class="app-header">
    <div class="brand">
      <span class="brand-logo">AI</span>
      <div class="brand-meta">
        <h1>图像创作助手</h1>
      </div>
    </div>
    <div class="header-controls">
      <div class="header-status">
        <span class="status-indicator" :class="{ active: props.hasPendingTasks }" />
        <span class="status-text">
          {{ props.hasPendingTasks ? '生成进行中' : '等待新的创意' }}
        </span>
      </div>
      <div class="user-meta">
        <span class="user-avatar">{{ props.user.username.charAt(0).toUpperCase() }}</span>
        <span class="user-name">{{ props.user.username }}</span>
        <button class="logout-button" type="button" @click="emit('logout')">退出</button>
      </div>
    </div>
  </header>
</template>
