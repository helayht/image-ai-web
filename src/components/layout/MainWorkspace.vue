<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import AppHeader from './AppHeader.vue'
import SidebarPanel from './SidebarPanel.vue'
import ConversationView from '../chat/ConversationView.vue'
import ChatComposer from '../chat/ChatComposer.vue'
import { useTextToImage } from '../../composables/useTextToImage'

const props = defineProps({
  user: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['logout'])

const {
  promptInput,
  submissionError,
  isSubmitting,
  chatItems,
  referenceImageFile,
  referenceImagePreview,
  globalError,
  hasPendingTasks,
  generationMode,
  selectedSize,
  sizeOptions,
  handleReferenceFile,
  clearReferenceImage,
  setGenerationMode,
  submitPrompt,
  retryModel,
  resetConversation,
} = useTextToImage()

const conversationRef = ref(null)

const referenceImageName = computed(
  () => referenceImageFile.value && referenceImageFile.value.name,
)

const createSession = (title = '新对话') => ({
  id: `session-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  title,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

const sessions = ref([createSession()])
const activeSessionId = ref(sessions.value[0].id)

const activeSession = computed(() =>
  sessions.value.find((session) => session.id === activeSessionId.value),
)

const scrollToBottom = () => {
  const container = conversationRef.value?.getContainer()
  if (!container) return
  container.scrollTo({
    top: container.scrollHeight,
    behavior: 'smooth',
  })
}

watch(
  chatItems,
  () => {
    nextTick(scrollToBottom)
    const session = activeSession.value
    if (!session) return
    const firstUserMessage = chatItems.value.find(
      (entry) => entry.role === 'user' && entry.prompt,
    )
    if (firstUserMessage?.prompt) {
      session.title =
        firstUserMessage.prompt.length > 20
          ? `${firstUserMessage.prompt.slice(0, 20)}…`
          : firstUserMessage.prompt
    } else {
      session.title = '新对话'
    }
    session.updatedAt = new Date().toISOString()
  },
  { deep: true },
)

const handleFileSelection = (file) => {
  handleReferenceFile(file)
}

const handleSizeChange = (value) => {
  selectedSize.value = value
}

const handleStartNewChat = () => {
  const newSession = createSession()
  sessions.value.unshift(newSession)
  activeSessionId.value = newSession.id
  resetConversation()
}

const handleSelectSession = (session) => {
  if (!session || session.id === activeSessionId.value) return
  // 功能预留：后续在此恢复历史对话内容
}
</script>

<template>
  <div class="workspace-shell">
    <AppHeader
      :user="props.user"
      :has-pending-tasks="hasPendingTasks"
      @logout="emit('logout')"
    />
    <div class="workspace-body">
      <SidebarPanel
        :has-pending-tasks="hasPendingTasks"
        :sessions="sessions"
        :active-session-id="activeSessionId"
        @new-chat="handleStartNewChat"
        @select-session="handleSelectSession"
      />
      <section class="workspace-main">
        <ConversationView
          ref="conversationRef"
          :items="chatItems"
          @retry="retryModel"
        />
        <ChatComposer
          v-model:prompt="promptInput"
          :generation-mode="generationMode"
          :size="selectedSize"
          :size-options="sizeOptions"
          :is-submitting="isSubmitting"
          :submission-error="submissionError"
          :reference-image-name="referenceImageName"
          :reference-image-preview="referenceImagePreview"
          :global-error="globalError"
          @submit="submitPrompt"
          @update:generation-mode="setGenerationMode"
          @update:size="handleSizeChange"
          @select-file="handleFileSelection"
          @clear-file="() => clearReferenceImage()"
        />
      </section>
    </div>
  </div>
</template>
