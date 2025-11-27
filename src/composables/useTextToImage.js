import { computed, reactive, ref, watch } from 'vue'

const API_ROOT = 'http://localhost:8080/image/ai/api'
const API_CHAT = `${API_ROOT}/chat`
const API_MESSAGE = `${API_ROOT}/message`
const MODEL_CONFIG = [
  {
    id: 'cogview-3-flash',
    label: '智谱清言',
  },
  {
    id: 'doubao-seedream-4-0',
    label: '豆包',
  },
]
const POLL_INTERVAL_MS = 1000
const POLL_TIMEOUT_MS = 60000
const DEFAULT_ERROR_TEXT = '生成失败，请稍后再试'
const DEFAULT_SIZE = '1024x1024'
const SUPPORTED_SIZES = [
  { label: '1024 × 1024', value: '1024x1024' },
  { label: '768 × 1344', value: '768x1344' },
  { label: '864x1152', value: '864x1152' },
  { label: '1152x864', value: '1152x864' },
  { label: '1440x720', value: '1440x720' },
  { label: '720x1440', value: '720x1440' },
]

let idCounter = 0
const createId = (prefix) => `${prefix}-${Date.now()}-${++idCounter}`

export const useTextToImage = () => {
  const promptInput = ref('')
  const submissionError = ref('')
  const globalError = ref('')
  const isSubmitting = ref(false)
  const chatItems = ref([])
  const generationMode = ref('text-to-image')
  const referenceImageFile = ref(null)
  const referenceImagePreview = ref('')
  const selectedSize = ref(DEFAULT_SIZE)
  const sizeOptions = ref([...SUPPORTED_SIZES])
  const sessions = ref([])
  const activeSessionId = ref('')
  const isLoadingSessions = ref(false)

  const createSession = ({
    title = '新对话',
    conversationId = null,
    updatedAt = new Date().toISOString(),
  } = {}) =>
    reactive({
      id: createId('session'),
      conversationId,
      title,
      updatedAt,
    })

  const activeSession = computed(() =>
    sessions.value.find((session) => session.id === activeSessionId.value),
  )

  const taskTrackers = new Map()

  const stopAllTrackers = () => {
    taskTrackers.forEach((tracker) => {
      if (tracker?.timer) {
        clearTimeout(tracker.timer)
      }
    })
    taskTrackers.clear()
  }

  const hasPendingTasks = computed(() =>
    chatItems.value.some(
      (item) =>
        item.role === 'assistant' &&
        Array.isArray(item.models) &&
        item.models.some((model) =>
          ['queued', 'running'].includes(model.status),
        ),
    ),
  )

  watch(
    chatItems,
    () => {
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
      } else if (!session.title) {
        session.title = '新对话'
      }
      session.updatedAt = new Date().toISOString()
    },
    { deep: true },
  )

  const mapAssistantModels = (entries = []) =>
    entries.map((entry) =>
      reactive({
        key: `${entry.modelId || 'model'}-${Math.random().toString(16).slice(2, 8)}`,
        modelId: entry.modelId || '',
        modelName: entry.modelName || '生成结果',
        status: entry.imageURL ? 'succeeded' : 'failed',
        imageUrl: entry.imageURL || '',
        errorMessage: entry.imageURL ? '' : DEFAULT_ERROR_TEXT,
      }),
    )

  const normalizeMessageEntry = (entry) => {
    const createdAt = entry?.createdTime
      ? new Date(entry.createdTime).toISOString()
      : new Date().toISOString()
    if (entry?.role === 'assistant') {
      return reactive({
        id: createId('assistant'),
        role: 'assistant',
        createdAt,
        models: mapAssistantModels(entry.assistantMessages || []),
        taskId: null,
      })
    }
    return reactive({
      id: createId('user'),
      role: 'user',
      prompt: entry?.content || entry?.title || '',
      createdAt,
      referenceImagePreview: entry?.attachmentURL || '',
    })
  }

  const loadConversationMessages = async (conversationId) => {
    if (!conversationId) {
      chatItems.value = []
      return
    }
    stopAllTrackers()
    try {
      const response = await fetch(`${API_MESSAGE}/list/${conversationId}`)
      const payload = await response.json()
      if (payload.code !== '200' || !Array.isArray(payload.data)) {
        chatItems.value = []
        return
      }
      chatItems.value = payload.data.map((entry) => normalizeMessageEntry(entry))
    } catch (error) {
      chatItems.value = []
    }
  }

  const ensureActiveSession = () => {
    if (activeSession.value) return activeSession.value
    if (!sessions.value.length) {
      const draft = createSession()
      sessions.value.push(draft)
    }
    activeSessionId.value = sessions.value[0].id
    return sessions.value[0]
  }

  const loadConversations = async () => {
    isLoadingSessions.value = true
    try {
      const response = await fetch(`${API_MESSAGE}/conversations_list`)
      const payload = await response.json()
      if (payload.code === '200' && Array.isArray(payload.data)) {
        sessions.value = payload.data.map((record) =>
          createSession({
            title: record.title || '新对话',
            conversationId: record.id ?? null,
            updatedAt: record.createdTime || record.updatedTime || new Date().toISOString(),
          }),
        )
      }
    } catch (error) {
      // ignore load error, keep local draft
    } finally {
      isLoadingSessions.value = false
      const current = ensureActiveSession()
      if (current?.conversationId) {
        await loadConversationMessages(current.conversationId)
      } else {
        chatItems.value = []
      }
    }
  }

  const startNewSession = () => {
    stopAllTrackers()
    const newSession = createSession()
    sessions.value.unshift(newSession)
    activeSessionId.value = newSession.id
    promptInput.value = ''
    submissionError.value = ''
    globalError.value = ''
    chatItems.value = []
    generationMode.value = 'text-to-image'
    clearReferenceImage()
    selectedSize.value = DEFAULT_SIZE
  }

  const selectSession = async (session) => {
    if (!session || session.id === activeSessionId.value) return
    stopAllTrackers()
    activeSessionId.value = session.id
    promptInput.value = ''
    submissionError.value = ''
    globalError.value = ''
    chatItems.value = []
    generationMode.value = 'text-to-image'
    clearReferenceImage()
    selectedSize.value = DEFAULT_SIZE
    if (session.conversationId) {
      await loadConversationMessages(session.conversationId)
    }
  }

  const clearReferenceImage = () => {
    referenceImageFile.value = null
    referenceImagePreview.value = ''
  }

  const handleReferenceFile = (file) => {
    if (!file) {
      clearReferenceImage()
      return
    }
    if (!file.type?.startsWith('image/')) {
      globalError.value = '仅支持图片文件作为参考图'
      clearReferenceImage()
      return
    }
    referenceImageFile.value = file
    if (typeof FileReader === 'undefined') {
      referenceImagePreview.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      referenceImagePreview.value = reader.result?.toString() || ''
    }
    reader.readAsDataURL(file)
  }

  const setGenerationMode = (mode) => {
    if (generationMode.value === mode) return
    generationMode.value = mode
    if (mode !== 'image-to-image') {
      clearReferenceImage()
    }
  }

  const createUserMessage = (prompt) =>
    reactive({
      id: createId('user'),
      role: 'user',
      prompt,
      createdAt: new Date().toISOString(),
      referenceImagePreview: referenceImagePreview.value,
    })

  const createAssistantMessage = () =>
    reactive({
      id: createId('assistant'),
      role: 'assistant',
      createdAt: new Date().toISOString(),
      models: MODEL_CONFIG.map((model) =>
        reactive({
          key: `${model.id}-${Math.random().toString(16).slice(2, 8)}`,
          modelId: model.id,
          modelName: model.label,
          status: 'queued',
          imageUrl: '',
          errorMessage: '',
        }),
      ),
      taskId: null,
    })

  const cleanupTracker = (messageId) => {
    const tracker = taskTrackers.get(messageId)
    if (tracker?.timer) {
      clearTimeout(tracker.timer)
    }
    taskTrackers.delete(messageId)
  }

  const finalizeFailure = (message, errorText = DEFAULT_ERROR_TEXT) => {
    if (!message?.models) return
    message.models.forEach((model) => {
      model.status = 'failed'
      model.errorMessage = errorText
    })
    globalError.value = errorText
    cleanupTracker(message.id)
  }

  const applyResultsToMessage = (message, resultList = []) => {
    if (!message?.models) return
    const resultMap = new Map()
    resultList.forEach((entry) => {
      if (!entry?.modelId) return
      resultMap.set(entry.modelId, {
        imageUrl: entry.imageURL || '',
        dateTime: entry.dateTime || '',
        modelName: entry.modelName || '',
      })
    })
    message.models.forEach((model) => {
      const mapped = resultMap.get(model.modelId)
      if (mapped?.imageUrl) {
        model.status = 'succeeded'
        model.imageUrl = mapped.imageUrl
        model.errorMessage = ''
      } else {
        model.status = 'failed'
        model.errorMessage = DEFAULT_ERROR_TEXT
      }
    })
  }

  const pollTaskUntilDone = (message, taskId) => {
    const tracker = {
      start: Date.now(),
      timer: null,
      messageId: message.id,
    }
    taskTrackers.set(message.id, tracker)

    const poll = async () => {
      if (Date.now() - tracker.start >= POLL_TIMEOUT_MS) {
        finalizeFailure(message, '生成超时，请稍后再试')
        return
      }
      try {
        const response = await fetch(`${API_CHAT}/tasks/${taskId}`)
        const payload = await response.json()
        if (payload.code !== '200' || !payload.data) {
          finalizeFailure(message)
          return
        }
        const { status, chatResultEntityList } = payload.data
        if (status === 'running') {
          message.models.forEach((model) => {
            model.status = 'running'
          })
          tracker.timer = setTimeout(poll, POLL_INTERVAL_MS)
          return
        }
        if (status === 'success') {
          applyResultsToMessage(message, chatResultEntityList)
          console.log('message', message)
          cleanupTracker(message.id)
          return
        }
        finalizeFailure(message)
      } catch (error) {
        finalizeFailure(message)
      }
    }

    poll()
  }

  const submitPrompt = async () => {
    submissionError.value = ''
    globalError.value = ''
    const trimmedPrompt = promptInput.value.trim()
    if (!trimmedPrompt) {
      submissionError.value = '请输入描述内容'
      return
    }
    if (
      generationMode.value === 'image-to-image' &&
      !referenceImageFile.value
    ) {
      submissionError.value = '请先上传参考图'
      return
    }
    const session = ensureActiveSession()
    const conversationId = session?.conversationId ?? null
    const userMessage = createUserMessage(trimmedPrompt)
    const assistantMessage = createAssistantMessage()
    chatItems.value.push(userMessage, assistantMessage)

    promptInput.value = ''
    isSubmitting.value = true
    try {
      const models = MODEL_CONFIG.map((model) => model.id)
      const basePayload = {
        prompt: trimmedPrompt,
        models,
        size: selectedSize.value,
        mode: 'fast',
        conversationsId: conversationId ?? null,
      }
      const payload =
        generationMode.value === 'text-to-image'
          ? await (async () => {
              const response = await fetch(`${API_CHAT}/text_to_image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(basePayload),
              })
              return response.json()
            })()
          : await (async () => {
              const formData = new FormData()
              formData.append(
                'chatRequestDTO',
                new Blob(
                  [JSON.stringify(basePayload)],
                  { type: 'application/json' },
                ),
              )
              formData.append('imageFile', referenceImageFile.value)
              const response = await fetch(`${API_CHAT}/image_to_image`, {
                method: 'POST',
                body: formData,
              })
              return response.json()
            })()
      if (payload.code !== '200' || !payload.data) {
        finalizeFailure(assistantMessage)
        return
      }
      const taskId = payload.data?.taskId ?? payload.data
      const newConversationId = payload.data?.conversationsId ?? conversationId ?? null
      if (!taskId) {
        finalizeFailure(assistantMessage)
        return
      }
      assistantMessage.taskId = taskId
      assistantMessage.models.forEach((model) => {
        model.status = 'running'
      })
      const active = activeSession.value || session
      if (active) {
        active.conversationId = newConversationId
        active.updatedAt = new Date().toISOString()
      } else if (newConversationId) {
        const created = createSession({ conversationId: newConversationId })
        sessions.value.unshift(created)
        activeSessionId.value = created.id
      }
      pollTaskUntilDone(assistantMessage, taskId)
    } catch (error) {
      finalizeFailure(assistantMessage)
    } finally {
      isSubmitting.value = false
    }
  }

  const retryModel = () => {
    globalError.value = '当前不支持手动重试'
  }

  const resetConversation = () => {
    promptInput.value = ''
    submissionError.value = ''
    globalError.value = ''
    chatItems.value = []
    generationMode.value = 'text-to-image'
    clearReferenceImage()
    selectedSize.value = DEFAULT_SIZE
    stopAllTrackers()
  }

  return {
    promptInput,
    submissionError,
    isSubmitting,
    chatItems,
    referenceImageFile,
    referenceImagePreview,
    globalError,
    hasPendingTasks,
    sessions,
    activeSessionId,
    isLoadingSessions,
    generationMode,
    selectedSize,
    sizeOptions,
    handleReferenceFile,
    clearReferenceImage,
    setGenerationMode,
    loadConversations,
    startNewSession,
    selectSession,
    submitPrompt,
    retryModel,
    resetConversation,
  }
}
