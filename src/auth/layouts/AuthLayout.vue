<template>
  <div class="row auth-layout q-ma-none" style="background: #e8e8e8; min-height: 100vh">
    <div class="col-12 col-md-6 flex flex-center auth-layout__form">
      <router-view />
    </div>
    <div class="gt-sm col-md-6 auth-layout__hero" />
  </div>
</template>

<style scoped>
.auth-layout__hero {
  min-height: 100vh;
  background-image: url('src/assets/people/rainbow_hair.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.auth-layout__form {
  min-height: 100vh;
  align-self: stretch;
}
</style>
