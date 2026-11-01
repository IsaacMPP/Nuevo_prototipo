<script lang="ts">
  // Presentational component. The future FreeShow integration supplies handlers.
  export let logoSrc = "/ja-logo.png"
  export let onScreens: () => void = () => {}
  export let onSettings: () => void = () => {}
</script>

<header class="ja-app-header">
  <div class="ja-app-brand" aria-label="JA Proyección">
    <img src={logoSrc} alt="Emblema JA" />
    <span class="ja-app-brand-name">JA <strong>Proyección</strong></span>
  </div>
  <nav class="ja-app-toolbar" aria-label="Acciones principales">
    <button type="button" on:click={onScreens}>Pantallas</button>
    <button type="button" on:click={onSettings}>Configuración</button>
  </nav>
</header>
<style>
  @import "./ja-theme.css";
</style>
