<script setup>
import { computed, onMounted, ref, watch } from 'vue'
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
  referenceVideoFile,
  referenceVideoName,
  globalError,
  hasPendingTasks,
  setUsername,
  isManagingSessions,
  selectedConversationIds,
  generationMode,
  selectedSize,
  sizeOptions,
  handleReferenceFile,
  clearReferenceImage,
  handleReferenceVideo,
  clearReferenceVideo,
  setGenerationMode,
  submitPrompt,
  retryModel,
  sessions,
  activeSessionId,
  loadConversations,
  startNewSession,
  selectSession,
  toggleManaging,
  toggleSelection,
  deleteSelectedConversations,
} = useTextToImage()

const conversationRef = ref(null)
const isSidebarCollapsed = ref(false)

const referenceImageName = computed(
  () => referenceImageFile.value && referenceImageFile.value.name,
)
const referenceVideoLabel = computed(
  () => referenceVideoFile.value && referenceVideoFile.value.name,
)

const handleFileSelection = (file) => {
  handleReferenceFile(file)
}

const handleVideoSelection = (file) => {
  handleReferenceVideo(file)
}

const handleSizeChange = (value) => {
  selectedSize.value = value
}

const handleStartNewChat = () => {
  startNewSession()
}

const handleSelectSession = (session) => {
  selectSession(session)
}

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

onMounted(() => {
  setUsername(props.user?.username || '')
  loadConversations()
})

watch(
  () => props.user?.username,
  (value) => {
    setUsername(value || '')
    loadConversations()
  },
)
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
        :is-collapsed="isSidebarCollapsed"
        :is-managing="isManagingSessions"
        :selected-conversation-ids="selectedConversationIds"
        @new-chat="handleStartNewChat"
        @select-session="handleSelectSession"
        @toggle-manage="toggleManaging"
        @toggle-select="toggleSelection"
        @delete-selected="deleteSelectedConversations"
        @toggle-collapse="toggleSidebar"
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
          :reference-video-name="referenceVideoLabel"
          :global-error="globalError"
          @submit="submitPrompt"
          @update:generation-mode="setGenerationMode"
          @update:size="handleSizeChange"
          @select-file="handleFileSelection"
          @clear-file="() => clearReferenceImage()"
          @select-video-file="handleVideoSelection"
          @clear-video-file="() => clearReferenceVideo()"
        />
      </section>
    </div>
  </div>
</template>
