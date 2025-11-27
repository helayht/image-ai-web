<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  prompt: {
    type: String,
    default: '',
  },
  size: {
    type: String,
    default: '1024x1024',
  },
  sizeOptions: {
    type: Array,
    default: () => [],
  },
  generationMode: {
    type: String,
    default: 'text-to-image',
  },
  isSubmitting: {
    type: Boolean,
    default: false,
  },
  submissionError: {
    type: String,
    default: '',
  },
  referenceImageName: {
    type: String,
    default: '',
  },
  referenceImagePreview: {
    type: String,
    default: '',
  },
  globalError: {
    type: String,
    default: '',
  },
})

const emit = defineEmits([
  'update:prompt',
  'update:generation-mode',
  'update:size',
  'submit',
  'select-file',
  'clear-file',
])

const fileInputRef = ref(null)
const isImageMode = computed(
  () => props.generationMode === 'image-to-image',
)

const handleFileChange = (event) => {
  if (!isImageMode.value) return
  const [file] = event.target.files || []
  emit('select-file', file || null)
}

const openFilePicker = () => {
  if (!isImageMode.value) return
  fileInputRef.value?.click()
}

const handleClearFile = () => {
  emit('clear-file')
}

const updateGenerationMode = (mode) => {
  if (mode === props.generationMode) return
  emit('update:generation-mode', mode)
}

const handleSizeChange = (event) => {
  emit('update:size', event.target.value)
}

watch(
  () => props.referenceImageName,
  (value, oldValue) => {
    if (!value && oldValue && fileInputRef.value) {
      fileInputRef.value.value = ''
    }
  },
)
</script>

<template>
  <section class="composer">
    <form class="composer-form" @submit.prevent="emit('submit')">
      <div class="composer-bar">
        <div class="mode-toggle">
          <button
            type="button"
            class="mode-option"
            :class="{ active: props.generationMode === 'text-to-image' }"
            @click="updateGenerationMode('text-to-image')"
          >
            文生图
          </button>
          <button
            type="button"
            class="mode-option"
            :class="{ active: props.generationMode === 'image-to-image' }"
            @click="updateGenerationMode('image-to-image')"
          >
            图生图
          </button>
        </div>
        <label class="size-selector compact">
          <span>尺寸</span>
          <select :value="props.size" @change="handleSizeChange">
            <option
              v-for="option in (props.sizeOptions.length ? props.sizeOptions : [{ label: props.size, value: props.size }])"
              :key="option.value || option"
              :value="option.value || option"
            >
              {{ option.label || option }}
            </option>
          </select>
        </label>
        <button
          v-if="isImageMode"
          type="button"
          class="upload-button"
          @click="openFilePicker"
        >
          添加参考图
        </button>
        <span v-else class="mode-hint">仅需文本描述</span>
        <span v-if="props.referenceImageName" class="file-meta inline">
          {{ props.referenceImageName }}
          <button type="button" class="remove-file" @click="handleClearFile">
            移除
          </button>
        </span>
      </div>

      <div class="input-field">
        <div class="textarea-wrapper">
          <textarea
            :value="props.prompt"
            rows="3"
            placeholder="描述理想的画面，例如：‘赛博朋克风的夜晚街景’"
            @input="emit('update:prompt', $event.target.value)"
          />
          <button
            type="submit"
            class="send-button"
            :disabled="props.isSubmitting"
            aria-label="发送"
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path
                d="M3.172 9.445 15.5 3.25a.75.75 0 0 1 1.042.901l-2.64 8.802a.75.75 0 0 1-1.24.32l-3.01-3.01a.25.25 0 0 0-.177-.073H8a.25.25 0 0 0-.25.25v1.976a.75.75 0 0 1-.22.53l-2.16 2.16a.75.75 0 0 1-1.26-.299L2.922 9.957a.75.75 0 0 1 .25-.812Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
        <input
          ref="fileInputRef"
          class="hidden-input"
          type="file"
          accept="image/*"
          :disabled="!isImageMode"
          @change="handleFileChange"
        />
      </div>

      <div v-if="props.submissionError" class="form-error">
        {{ props.submissionError }}
      </div>
    </form>
    <p v-if="props.globalError" class="global-error">{{ props.globalError }}</p>
  </section>
</template>
