<template>
  <!-- component -->
  <div class="row" style="background: gainsboro; height: 100vh; margin: 0">
    <!-- Left: Image -->
    <div class="col-6 flex flex-center" style="height: 100vh">
      <img
        src="src/assets/people/rainbow_hair.jpg"
        alt="Placeholder Image"
        style="height: 100%; width: 100%; object-fit: cover"
      />
    </div>
    <!-- Right: Login Form -->
    <div class="col-6 flex flex-center">
      <router-view />
    </div>
  </div>
</template>
