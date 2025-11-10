import { computed, reactive, ref } from 'vue'

const API_PREFIX = 'http://localhost:8080/image/ai/api/chat'
const MODEL_CONFIG = [
  {
    id: 'cogview-3-flash',
    label: 'CogView-3 Flash',
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

  const taskTrackers = new Map()

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
        const response = await fetch(`${API_PREFIX}/tasks/${taskId}`)
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
    if (generationMode.value !== 'text-to-image') {
      globalError.value = '当前仅支持文生图模式'
      return
    }
    const trimmedPrompt = promptInput.value.trim()
    if (!trimmedPrompt) {
      submissionError.value = '请输入描述内容'
      return
    }
    const userMessage = createUserMessage(trimmedPrompt)
    const assistantMessage = createAssistantMessage()
    chatItems.value.push(userMessage, assistantMessage)

    promptInput.value = ''
    isSubmitting.value = true
    try {
      const response = await fetch(`${API_PREFIX}/text_to_image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          models: MODEL_CONFIG.map((model) => model.id),
          size: selectedSize.value,
          mode: 'fast',
        }),
      })
      const payload = await response.json()
      if (payload.code !== '200' || !payload.data) {
        finalizeFailure(assistantMessage)
        return
      }
      assistantMessage.taskId = payload.data
      assistantMessage.models.forEach((model) => {
        model.status = 'running'
      })
      pollTaskUntilDone(assistantMessage, payload.data)
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
    taskTrackers.forEach((tracker) => {
      if (tracker?.timer) {
        clearTimeout(tracker.timer)
      }
    })
    taskTrackers.clear()
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
    generationMode,
    selectedSize,
    sizeOptions,
    handleReferenceFile,
    clearReferenceImage,
    setGenerationMode,
    submitPrompt,
    retryModel,
    resetConversation,
  }
}
