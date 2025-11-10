<script setup>
import { computed } from 'vue'

const props = defineProps({
  hasPendingTasks: {
    type: Boolean,
    default: false,
  },
  sessions: {
    type: Array,
    default: () => [],
  },
  activeSessionId: {
    type: [String, Number],
    default: '',
  },
})

const emit = defineEmits(['new-chat', 'select-session'])

const formattedSessions = computed(() =>
  props.sessions.map((session) => ({
    ...session,
    displayTime: session.updatedAt
      ? new Date(session.updatedAt).toLocaleString()
      : '',
  })),
)
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-top">
      <button class="sidebar-new-chat" type="button" @click="emit('new-chat')">
        <span class="icon">＋</span>
        新聊天
      </button>
    </div>
    <div class="sidebar-section history">
      <p class="sidebar-section-title">历史记录</p>
      <div class="history-list">
        <button
          v-for="session in formattedSessions"
          :key="session.id"
          class="history-item"
          :class="{ active: session.id === props.activeSessionId }"
          type="button"
          @click="emit('select-session', session)"
        >
          <span class="history-title">{{ session.title }}</span>
          <span class="history-time">{{ session.displayTime }}</span>
        </button>
      </div>
    </div>
    <div class="sidebar-section status">
      <p class="sidebar-section-title">系统状态</p>
      <div class="status-indicator-row">
        <span class="dot" :class="{ active: props.hasPendingTasks }" />
        <span>
          {{ props.hasPendingTasks ? '模型生成中' : '无排队任务' }}
        </span>
      </div>
    </div>
    <div class="sidebar-footer">
      <button class="sidebar-footer-button" type="button">设置</button>
      <button class="sidebar-footer-button" type="button">帮助中心</button>
    </div>
  </aside>
</template>
