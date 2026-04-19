<template>
  <q-page class="testimonials-page q-px-md q-py-lg">
    <section class="testimonials-wrap">
      <div class="testimonials-header">
        <div>
          <h1 class="text-h4 text-weight-bold q-my-none">Testimonios</h1>
          <p class="text-grey-7 q-mt-sm q-mb-none">
            Lo que dicen nuestros clientes sobre su experiencia.
          </p>
        </div>
        <div class="testimonials-summary">
          <div class="text-h5 text-weight-bold">{{ averageScore || '0.0' }}</div>
          <q-rating
            :model-value="averageScore"
            max="5"
            size="20px"
            color="amber-6"
            readonly
          />
          <div class="text-caption text-grey-7">
            {{ reviews.length }} reseña{{ reviews.length === 1 ? '' : 's' }}
          </div>
        </div>
      </div>

      <q-scroll-area
        class="testimonials-scroll-area"
        :thumb-style="scrollThumbStyle"
        :bar-style="scrollBarStyle"
        visible
      >
        <div class="testimonials-scroll-content">
          <div v-if="isLoading" class="testimonials-grid">
            <q-card v-for="index in 6" :key="index" class="testimonial-card">
              <q-card-section>
                <div class="row items-center q-col-gutter-sm">
                  <div class="col-auto">
                    <q-skeleton type="QAvatar" size="42px" />
                  </div>
                  <div class="col">
                    <q-skeleton type="text" width="60%" />
                    <q-skeleton type="text" width="35%" />
                  </div>
                </div>
                <q-skeleton type="text" class="q-mt-md" />
                <q-skeleton type="text" />
                <q-skeleton type="text" width="70%" />
              </q-card-section>
            </q-card>
          </div>

          <div v-else-if="!reviews.length" class="empty-state">
            <q-icon name="chat_bubble_outline" size="48px" color="grey-6" />
            <div class="text-subtitle1 text-weight-medium q-mt-sm">
              Aún no hay testimonios
            </div>
            <div class="text-caption text-grey-7">
              Sé la primera persona en compartir su experiencia.
            </div>
          </div>

          <div v-else class="testimonials-grid">
            <q-card v-for="review in reviews" :key="review.id" class="testimonial-card">
              <q-card-section>
                <div class="row items-center justify-between">
                  <div class="row items-center q-col-gutter-sm no-wrap">
                    <div class="col-auto">
                      <q-avatar color="primary" text-color="white">
                        {{ getInitial(review.name) }}
                      </q-avatar>
                    </div>
                    <div class="col">
                      <div class="text-weight-medium ellipsis">{{ review.name }}</div>
                      <div class="text-caption text-grey-7">
                        {{ formatDate(review.createdAt) }}
                      </div>
                    </div>
                  </div>
                  <q-rating
                    :model-value="review.score"
                    max="5"
                    size="18px"
                    color="amber-6"
                    readonly
                  />
                </div>
                <p class="testimonial-text q-mt-md q-mb-none">
                  {{ review.description }}
                </p>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-scroll-area>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useReviews } from 'src/composables/reviews/useReviews';
import { useSeo } from 'src/composables/seo/useSeo';
import { reviewsSchema } from 'src/composables/seo/structuredData';

const { reviews, averageScore, isLoading } = useReviews();

useSeo({
  title: 'Testimonios | Peluquería Pecas',
  description:
    'Lo que dicen nuestros clientes sobre la experiencia en Peluquería Pecas: reseñas, calificaciones y opiniones reales.',
  path: '/testimonios',
  jsonLd: computed(() =>
    reviewsSchema(
      (reviews.value || []).map((review) => ({
        author: review.name,
        body: review.description,
        rating: Number(review.score) || undefined,
        date: review.createdAt,
      })),
    ),
  ),
});

const scrollThumbStyle = {
  right: '2px',
  borderRadius: '8px',
  backgroundColor: 'rgba(80, 80, 80, 0.22)',
  width: '6px',
  opacity: '0.9',
};

const scrollBarStyle = {
  right: '2px',
  borderRadius: '8px',
  backgroundColor: 'rgba(0, 0, 0, 0.08)',
  width: '6px',
  opacity: '0.25',
};

const getInitial = (name: string) => (name?.trim()?.charAt(0) || '?').toUpperCase();

const formatDate = (dateText: string) => {
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

defineOptions({
  name: 'TestimonialsPage',
});
</script>

<style scoped lang="scss">
.testimonials-page {
  background: linear-gradient(
    160deg,
    rgba(255, 255, 255, 0.52) 0%,
    rgba(245, 245, 245, 0.48) 45%,
    rgba(250, 248, 250, 0.55) 100%
  );
}

.testimonials-wrap {
  width: min(1120px, 100%);
  margin: 0 auto;
}

.testimonials-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
  background: rgba(255, 255, 255, 0.86);
  border-radius: 14px;
  padding: 18px;
}

.testimonials-summary {
  text-align: right;
}

.testimonials-scroll-area {
  height: clamp(320px, calc(100vh - 290px), 760px);
}

.testimonials-scroll-content {
  padding-right: 8px;
}

.testimonials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

.testimonial-card {
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.testimonial-text {
  color: #333;
  line-height: 1.55;
  white-space: pre-wrap;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.empty-state {
  min-height: 240px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 14px;
}

@media (max-width: 680px) {
  .testimonials-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .testimonials-summary {
    text-align: left;
  }

  .testimonials-scroll-area {
    height: clamp(280px, calc(100vh - 300px), 680px);
  }
}
</style>
