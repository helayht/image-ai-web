<script setup>
const props = defineProps({
  model: {
    type: Object,
    required: true,
  },
})

const statusText = (status) => {
  switch (status) {
    case 'succeeded':
      return '生成完成'
    case 'failed':
      return '生成失败'
    case 'running':
      return '生成中'
    case 'queued':
      return '排队中'
    default:
      return '等待中'
  }
}

</script>

<template>
  <article class="model-card">
    <header class="model-card-header">
      <div class="model-info">
        <h3>{{ model.modelName }}</h3>
        <span class="model-status" :class="model.status">
          {{ statusText(model.status) }}
        </span>
      </div>
    </header>

    <div class="model-content">
      <div v-if="model.status === 'succeeded' && model.imageUrl" class="model-image-wrapper">
        <img :src="model.imageUrl" :alt="`${model.modelName} 生成结果`" loading="lazy"/>
        <div class="model-actions">
<!--          <a class="link-button" :href="model.imageUrl" target="_blank" rel="noopener">-->
<!--            新窗口查看-->
<!--          </a>-->
          <a class="link-button" :href="model.imageUrl" download>
            下载图片
          </a>
        </div>
      </div>
      <div v-else-if="model.status === 'failed'" class="model-error">
        <p>{{ model.errorMessage || '未获取到错误信息' }}</p>
      </div>
      <div v-else class="model-placeholder">
        <span class="spinner" />
        <p>等待模型完成生成…</p>
      </div>
    </div>
  </article>
</template>
