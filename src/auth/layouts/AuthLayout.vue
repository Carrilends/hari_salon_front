<template>
  <div class="row auth-layout q-ma-none" style="background: gainsboro; min-height: 100vh">
    <div class="gt-md col-md-6 flex flex-center auth-layout__hero">
      <img
        src="src/assets/people/rainbow_hair.jpg"
        alt=""
        class="auth-layout__hero-img"
      />
    </div>
    <div class="col-12 col-md-6 flex flex-center auth-layout__form">
      <router-view />
    </div>
  </div>
</template>

<style scoped>
.auth-layout__hero {
  min-height: 100vh;
}

.auth-layout__hero-img {
  height: 100%;
  width: 100%;
  min-height: 100vh;
  object-fit: cover;
}

.auth-layout__form {
  min-height: 100vh;
  align-self: stretch;
}
</style>
