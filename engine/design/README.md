# Diseño recuperado de JA Proyección

**Estado:** kit visual desacoplado para incorporar cuando se importe la base limpia FreeShow. No es una app ejecutable.

## Referencias confirmadas del repositorio anterior
- `src/frontend/components/main/Top.svelte`: encabezado azul marino, marca JA Proyección, emblema a la izquierda, botón Pantallas. Se ha recuperado su esquema de color, medidas y jerarquía como componente presentacional independiente `JAHeader.svelte`.
- `public/ja-logo.png` y `public/ja-hero.jpg`: recursos gráficos originales que deben transferirse como binarios sin alteración cuando se prepare la base FreeShow. Los presentes componentes referencian `/ja-logo.png` y **no sustituyen** el emblema por otro.
- `src/frontend/components/drawer/navigation/HymnalTabs.svelte`, `ScriptureTabs.svelte` y `NavigationSections.svelte`: referencias para distribución de navegación y paneles. Son componentes funcionales con dependencias, **no se copiarán completos como diseño**.
- Mantener las pantallas nativas de FreeShow; no trasplantar `jaPrimaryOutput.ts`, `jaDetectedDisplays.ts`, cambios a `menuClick.ts` ni otros parches de salidas del proyecto anterior.

## Reglas de integración
1. Integrar el encabezado/colores como capa de presentación sin reemplazar salidas, audio, configuración ni navegación nativa.
2. Mantener acciones reales conectadas al sistema (no botones que simulan funcionar).
3. Extender después a portada y módulos Biblia/Himnario, preservando jerarquía y estilo existentes mediante revisión visual antes de modificar.
4. Cada modificación visual llevará pruebas de build, revisión de resolución 1366×768 y 1920×1080, regresión de funcionalidad y actualización documental.
5. Los archivos PNG/JPG originales aún no están en este repositorio; incorporarlos con el arranque del motor respetando los archivos originales y licencias.

Origen de referencia: `IsaacMPP/Ja_Proyeccion` rama `feature/fase4-2-buscador-himnario`. Los estilos no constituyen una licencia separada del código del que se extrajeron; respetar la GPL de FreeShow si se redistribuye el producto derivado.
