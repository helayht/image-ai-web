<script setup>
import { computed } from 'vue'
import ModelResultCard from './ModelResultCard.vue'

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['retry'])

const isUser = computed(() => props.item.role === 'user')

const formattedTime = computed(() =>
  props.item.createdAt
    ? new Date(props.item.createdAt).toLocaleTimeString()
    : '',
)
</script>

<template>
  <article class="message" :class="isUser ? 'message-user' : 'message-assistant'">
    <div class="message-avatar">
      <span v-if="isUser">你</span>
      <span v-else>AI</span>
    </div>
    <div class="message-body">
      <header class="message-header">
        <strong>{{ isUser ? '我' : '多模型助手' }}</strong>
        <time>{{ formattedTime }}</time>
      </header>

      <template v-if="isUser">
        <p class="message-text">{{ item.prompt }}</p>
        <div v-if="item.referenceImagePreview" class="reference-preview">
          <img :src="item.referenceImagePreview" alt="参考图像预览" loading="lazy" />
          <span>参考图像</span>
        </div>
      </template>

      <template v-else>
        <p v-if="item.errorMessage" class="message-error">
          {{ item.errorMessage }}
        </p>
        <div v-if="item.isError" class="message-error">
          {{ item.errorMessage }}
        </div>
        <div v-else-if="item.models && item.models.length" class="model-grid">
          <ModelResultCard
            v-for="model in item.models"
            :key="model.key"
            :model="model"
            @retry="emit('retry', model)"
          />
        </div>
        <div v-else class="empty-state">
          <p>正在等待模型返回结果…</p>
        </div>
      </template>
    </div>
  </article>
</template>
