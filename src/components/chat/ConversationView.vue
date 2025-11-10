<script setup>
import { nextTick, ref, watch } from 'vue'
import MessageBubble from './MessageBubble.vue'

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['retry'])

const containerRef = ref(null)

const scrollToBottom = () => {
  if (!containerRef.value) return
  containerRef.value.scrollTo({
    top: containerRef.value.scrollHeight,
    behavior: 'smooth',
  })
}

watch(
  () => props.items,
  () => {
    nextTick(scrollToBottom)
  },
  { deep: true },
)

const getContainer = () => containerRef.value

defineExpose({ getContainer })
</script>

<template>
  <section class="conversation" ref="containerRef">
    <MessageBubble
      v-for="item in props.items"
      :key="item.id"
      :item="item"
      @retry="(model) => emit('retry', item, model)"
    />
  </section>
</template>
